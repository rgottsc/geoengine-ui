import {Injectable} from '@angular/core';
import {Http, Response} from '@angular/http';

import {BehaviorSubject, Observable} from 'rxjs/Rx';

import Config from '../app/config.model';
import {User, Guest} from './user.model';

import {MappingRequestParameters, ParametersType} from '../queries/request-parameters.model';

import {
    MappingSource, MappingSourceChannel, MappingTransform,
} from '../models/mapping-source.model';
import {Unit, UnitMappingDict} from '../operators/unit.model';

export interface Session {
    user: string;
    sessionToken: string;
}

class UserServiceRequestParameters extends MappingRequestParameters {
    constructor(config: {
        request: string,
        sessionToken: string,
        parameters?: ParametersType
    }) {
        super({
            service: 'USER',
            request: config.request,
            sessionToken: config.sessionToken,
            parameters: config.parameters,
        });
    }
}

class LoginRequestParameters extends UserServiceRequestParameters {
    constructor(config: {
        username: string;
        password: string;
    }) {
        super({
            request: 'login',
            sessionToken: undefined,
            parameters: {
                username: config.username,
                password: config.password,
            },
        });
    }
}

/**
 * A service that is responsible for retrieving user information and modifying the current user.
 */
@Injectable()
export class UserService {
    private user$: BehaviorSubject<User>;
    private session$: BehaviorSubject<Session>;

    private isGuestUser$: Observable<boolean>;

    constructor(
        private http: Http
    ) {
        const storedSession: Session = JSON.parse(localStorage.getItem('session'));
        this.session$ = new BehaviorSubject(
            // tslint:disable-next-line:no-null-keyword
            storedSession !== null ? storedSession : {
                user: Config.USER.GUEST.NAME,
                sessionToken: '',
            }
        );

        this.isGuestUser$ = this.session$.map(s => s.user === Config.USER.GUEST.NAME);

        // storage of the session
        this.session$.subscribe(newSession =>
            localStorage.setItem('session', JSON.stringify(newSession))
        );

        // user info
        this.user$ = new BehaviorSubject(new Guest());
        this.session$.subscribe(
            session => this.getUserDetails(session).then(
                user => user ? this.user$.next(user) : new Guest()
            )
        );
    }

    /**
     * @returns Retrieve the current user.
     */
    getUser() {
        return this.user$.getValue();
    }

    /**
     * @returns Retrieve a stream that notifies about the current user.
     */
    getUserStream(): Observable<User> {
        return this.user$;
    }

    /**
     * @returns Retrieve the current session.
     */
    getSession() {
        return this.session$.getValue();
    }

    /**
     * @returns Retrieve a stream that notifies about the current session.
     */
    getSessionStream(): Observable<Session> {
        return this.session$;
    }

    isGuestUserStream(): Observable<boolean> {
        return this.isGuestUser$;
    }

    /**
     * Login using user credentials. If it was successful, set a new user.
     * @param credentials.user The user name.
     * @param credentials.password The user's password.
     * @returns `true` if the login was succesful, `false` otherwise.
     */
    login(credentials: {user: string, password: string}): Promise<boolean> {
        const parameters = new LoginRequestParameters({
            username: credentials.user,
            password: credentials.password,
        });
        return this.request(parameters).then(response => {
            const result = response.json() as {result: string | boolean, session: string};
            const success = typeof result.result === 'boolean' && result.result === true;

            if (success) {
                this.session$.next({
                    user: credentials.user,
                    sessionToken: result.session,
                });
            }

            return success;
        });
    }

    guestLogin(): Promise<boolean> {
        return this.login({
            user: Config.USER.GUEST.NAME,
            password: Config.USER.GUEST.PASSWORD,
        });
    }

    /**
     * Login using user credentials. If it was successful, set a new user.
     * @param session.user The user name.
     * @param session.password The user's password.
     * @returns `true` if the login was succesful, `false` otherwise.
     */
    isSessionValid(session: Session): Promise<boolean> {
        return this.getUserDetails(session).then(user => !!user);
    }

    /**
     * Retrieve the user details.
     * @param session.user The user name.
     * @param session.password The user's password.
     * @returns the user details.
     */
    getUserDetails(session: Session): Promise<User> {
        if (session.user === Config.USER.GUEST.NAME) {
            return Promise.resolve(new Guest());
        }

        const parameters = new UserServiceRequestParameters({
            request: 'info',
            sessionToken: session.sessionToken,
        });
        return this.request(parameters).then(response => {
            const result = response.json() as {result: string | boolean};
            const valid = typeof result.result === 'boolean' && result.result;

            if (valid) {
                const userResult = result as {
                    result: string | boolean,
                    username: string,
                    realname: string,
                    email: string,
                };
                return new User({
                    name: userResult.username,
                    realName: userResult.realname,
                    email: userResult.email,
                });
            } else {
                return undefined;
            }
        });
    }

    /**
     * Change the details of the current user.
     * @param details.firstName The first name
     * @param details.lastName  The last name
     * @param details.email     The E-Mail address
     */
    changeDetails(details: {realName: string, email: string}) {
        let user = this.getUser();
        user.realName = details.realName;
        user.email = details.email;

        this.user$.next(user);
    }

    /**
     * Get as stream of raster sources depending on the logged in user.
     */
    getRasterSourcesStream(): Observable<Array<MappingSource>> {
        interface MappingSourceResponse {
            sourcelist: {[index: string]: MappingSourceDict};
        }

        interface MappingSourceDict {
            name: string;
            colorizer: string;
            coords: {
                epsg: number,
                origin: number[],
                scale: number[],
                size: number[],
            };
            channels: [{
                datatype: string,
                nodata: number,
                name?: string,
                unit?: UnitMappingDict,
                transform?: {
                    unit?: UnitMappingDict,
                    datatype: string,
                    scale: number,
                    offset: number,
                },
            }];
        };

        return this.session$.switchMap(session => {
            const parameters = new UserServiceRequestParameters({
                request: 'sourcelist',
                sessionToken: session.sessionToken,
            });
            return this.request(parameters).then(
                response => response.json()
            ).then((json: MappingSourceResponse) => {
                const sources: Array<MappingSource> = [];

                for (const sourceId in json.sourcelist) {
                    const source: MappingSourceDict = json.sourcelist[sourceId];
                    sources.push({
                        source: sourceId,
                        name: source.name,
                        colorizer: source.colorizer,
                        coords: source.coords,
                        channels: source.channels.map((channel, index) => {
                            return {
                                id: index,
                                name: channel.name || 'Channel #' + index,
                                datatype: channel.datatype,
                                nodata: channel.nodata,
                                unit: channel.unit ?
                                    Unit.fromMappingDict(channel.unit) : Unit.defaultUnit,
                                hasTransform: !!channel.transform,
                                transform: channel.transform === undefined ?
                                    undefined : {
                                        unit: channel.transform.unit ?
                                            Unit.fromMappingDict(channel.transform.unit)
                                            : Unit.defaultUnit,
                                        datatype: channel.transform.datatype,
                                        offset: channel.transform.offset,
                                        scale: channel.transform.scale,
                                    } as MappingTransform,
                            } as MappingSourceChannel;
                        }),
                    });
                }

                return sources;
            });
        });

    }

    private request(requestParameters: UserServiceRequestParameters): Promise<Response> {
        return this.http.post(
            Config.MAPPING_URL,
            requestParameters.toMessageBody(),
            {headers: requestParameters.getHeaders()}
        ).toPromise();
    }

}
