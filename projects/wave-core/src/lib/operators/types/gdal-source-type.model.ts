import {OperatorType, OperatorTypeDict, OperatorTypeMappingDict} from '../operator-type.model';
import {Unit, UnitDict, UnitMappingDict} from '../unit.model';
import {GdalSourceChannelOptions} from '../parameter-options/gdal-source-parameter-options.model';

interface GdalSourceTypeConfig {
    channel?: number; // required for old configs
    channelConfig: GdalSourceChannelOptions;
    sourcename: string;
    transform: boolean;
    gdal_params?: GdalParamsType;
}

export interface GdalSourceTypeCloneOptions {
    channelConfig: GdalSourceChannelOptions;
}

interface GdalSourceTypeMappingDict extends OperatorTypeMappingDict {
    channel: number;
    sourcename: string;
    transform: boolean;
    gdal_params?: GdalParamsTypeMappingDict;
}

export interface GdalSourceTypeDict extends OperatorTypeDict {
    channelConfig: GdalSourceChannelOptions;
    sourcename: string;
    transform: boolean;
    gdal_params?: GdalParamsTypeDict;
}

/**
 * The raster source type.
 */
export class GdalSourceType extends OperatorType {
    private static _TYPE = 'gdal_source';
    private static _ICON_URL = OperatorType.createIconDataUrl(GdalSourceType._TYPE);
    private static _NAME = 'GDAL Source';

    static get TYPE(): string {
        return GdalSourceType._TYPE;
    }

    static get ICON_URL(): string {
        return GdalSourceType._ICON_URL;
    }

    static get NAME(): string {
        return GdalSourceType._NAME;
    }

    private channelConfig: GdalSourceChannelOptions;
    private sourcename: string;
    private transform: boolean;
    private gdalParams: GdalParamsType = undefined;

    static fromDict(dict: GdalSourceTypeDict): GdalSourceType {
        return new GdalSourceType({
            channel: dict['channel'], // old configs
            channelConfig: dict.channelConfig,
            gdal_params: dict.gdal_params ? {
                channels: dict.gdal_params.channels ? dict.gdal_params.channels.map(channelDict => {
                    return {
                        channel: channelDict.channel,
                        datatype: channelDict.datatype,
                        file_name: channelDict.file_name ? channelDict.file_name : undefined,
                        path: channelDict.path ? channelDict.path : undefined,
                        unit: Unit.fromDict(channelDict.unit),
                        netcdf_subdataset: channelDict.netcdf_subdataset ? channelDict.netcdf_subdataset : undefined,
                    };
                }) : undefined,
                file_name: dict.gdal_params.file_name ? dict.gdal_params.file_name : undefined,
                path: dict.gdal_params.path ? dict.gdal_params.path : undefined,
                coords: dict.gdal_params.coords,
                provenance: dict.gdal_params.provenance,
                netcdf_subdataset: dict.gdal_params.netcdf_subdataset ? dict.gdal_params.netcdf_subdataset : undefined,
            } : undefined,
            sourcename: dict.sourcename,
            transform: dict.transform,
        });
    }

    constructor(config: GdalSourceTypeConfig) {
        super();
        this.channelConfig = (config.channelConfig) ?
            config.channelConfig : {displayValue: 'channel number ' + config.channel, channelNumber: config.channel}; // convert old configs
        this.sourcename = config.sourcename;
        this.transform = config.transform;
        this.gdalParams = config.gdal_params;
    }

    getMappingName(): string {
        return GdalSourceType.TYPE;
    }

    getIconUrl(): string {
        return GdalSourceType.ICON_URL;
    }

    toString(): string {
        return GdalSourceType.NAME;
    }

    getParametersAsStrings(): Array<[string, string]> {
        return [
            ['channelConfig', this.channelConfig.displayValue.toString()],
            ['sourcename', this.sourcename.toString()],
            ['transform', this.transform.toString()],
        ];
    }

    getParameterValue(parameterName: string): GdalSourceChannelOptions | undefined {
        switch (parameterName) {
            case 'channelConfig':
                return this.channelConfig;
            default:
                return undefined;
        }
    }

    toMappingDict(): GdalSourceTypeMappingDict {
        return {
            sourcename: this.sourcename,
            channel: this.channelConfig.channelNumber,
            transform: this.transform,
            gdal_params: this.gdalParams ? {
                channels: this.gdalParams.channels ? this.gdalParams.channels.map(channelDict => {
                    return {
                        channel: channelDict.channel,
                        datatype: channelDict.datatype,
                        file_name: channelDict.file_name ? channelDict.file_name : undefined,
                        path: channelDict.path ? channelDict.path : undefined,
                        unit: channelDict.unit.toMappingDict(),
                        netcdf_subdataset: channelDict.netcdf_subdataset ? channelDict.netcdf_subdataset : undefined,
                    };
                }) : undefined,
                file_name: this.gdalParams.file_name ? this.gdalParams.file_name : undefined,
                path: this.gdalParams.path ? this.gdalParams.path : undefined,
                netcdf_subdataset: this.gdalParams.netcdf_subdataset ? this.gdalParams.netcdf_subdataset : undefined,
                coords: this.gdalParams.coords,
                provenance: this.gdalParams.provenance,
            } : undefined,
        };
    }

    toDict(): GdalSourceTypeDict {
        return {
            operatorType: GdalSourceType.TYPE,
            sourcename: this.sourcename,
            channelConfig: this.channelConfig,
            transform: this.transform,
            gdal_params: this.gdalParams ? {
                channels: this.gdalParams.channels ? this.gdalParams.channels.map(channelDict => {
                    return {
                        channel: channelDict.channel,
                        datatype: channelDict.datatype,
                        file_name: channelDict.file_name ? channelDict.file_name : undefined,
                        path: channelDict.path ? channelDict.path : undefined,
                        unit: channelDict.unit.toDict(),
                        netcdf_subdataset: channelDict.netcdf_subdataset ? channelDict.netcdf_subdataset : undefined,
                    };
                }) : undefined,
                file_name: this.gdalParams.file_name ? this.gdalParams.file_name : undefined,
                path: this.gdalParams.path ? this.gdalParams.path : undefined,
                netcdf_subdataset: this.gdalParams.netcdf_subdataset ? this.gdalParams.netcdf_subdataset : undefined,
                coords: this.gdalParams.coords,
                provenance: this.gdalParams.provenance,
            } : undefined,
        };
    }

    cloneWithModifications(options?: GdalSourceTypeCloneOptions): OperatorType {
        return new GdalSourceType({
            channelConfig: options && options.channelConfig ? options.channelConfig : this.channelConfig,
            sourcename: this.sourcename,
            transform: this.transform,
            gdal_params: this.gdalParams ? this.gdalParams : undefined,
        });
    }

}


export interface GdalParamsType {
    channels: Array<{
        channel: number;
        datatype: string;
        file_name?: string;
        path?: string;
        unit: Unit;
        netcdf_subdataset?: string;
    }>;
    netcdf_subdataset?: string;
    file_name?: string;
    path?: string;
    coords: {
        crs: string;
    };
    provenance: {
        citation: string,
        license: string,
        uri: string,
    };
}

export interface GdalParamsTypeDict {
    channels: Array<{
        channel: number;
        datatype: string;
        file_name?: string;
        path?: string;
        unit: UnitDict;
        netcdf_subdataset?: string;
    }>;
    netcdf_subdataset?: string;
    file_name?: string;
    path?: string;
    coords: {
        crs: string;
    };
    provenance: {
        citation: string,
        license: string,
        uri: string,
    };
}

export interface GdalParamsTypeMappingDict {
    channels: Array<{
        channel: number;
        datatype: string;
        file_name?: string;
        path?: string;
        unit: UnitMappingDict;
        netcdf_subdataset?: string;
    }>;
    file_name?: string;
    netcdf_subdataset?: string;
    path?: string;
    coords: {
        crs: string;
    };
    provenance: {
        citation: string,
        license: string,
        uri: string,
    };
}
