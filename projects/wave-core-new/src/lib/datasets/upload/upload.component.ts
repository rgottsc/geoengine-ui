import {HttpEventType} from '@angular/common/http';
import {Component, ChangeDetectionStrategy, ViewChild, ChangeDetectorRef} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MatChipInputEvent} from '@angular/material/chips';
import {MatVerticalStepper} from '@angular/material/stepper';
import {Subject} from 'rxjs';
import {mergeMap} from 'rxjs/operators';
import {
    AddDatasetDict,
    CreateDatasetDict,
    DatasetDefinitionDict,
    DatasetIdDict,
    MetaDataDefinitionDict,
    MetaDataSuggestionDict,
    OgrSourceDatasetTimeTypeDict,
    OgrSourceTimeFormatDict,
    UUID,
} from '../../backend/backend.model';
import {NotificationService} from '../../notification.service';
import {ProjectService} from '../../project/project.service';
import {DatasetService} from '../dataset.service';

@Component({
    selector: 'wave-upload',
    templateUrl: './upload.component.html',
    styleUrls: ['./upload.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadComponent {
    vectorDataTypes = ['Data', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
    timeTypes = ['None', 'Start', 'Start/End', 'Start/Duration'];
    timeFormats = ['auto', 'seconds', 'custom'];
    errorHandlings = ['ignore', 'abort'];

    @ViewChild(MatVerticalStepper) stepper!: MatVerticalStepper;

    progress$ = new Subject<number>();
    metaDataSuggestion$ = new Subject<MetaDataSuggestionDict>();

    uploadId?: UUID;
    datasetId?: DatasetIdDict;
    selectedFiles?: Array<File>;
    selectedTimeType?: string;

    formMetaData: FormGroup;
    formNameDescription: FormGroup;

    constructor(
        protected datasetService: DatasetService,
        protected notificationService: NotificationService,
        protected projectService: ProjectService,
        protected changeDetectorRef: ChangeDetectorRef,
    ) {
        this.formMetaData = new FormGroup({
            mainFile: new FormControl('', Validators.required),
            layerName: new FormControl('', Validators.required),
            dataType: new FormControl('', Validators.required),
            timeType: new FormControl('', Validators.required),
            timeStartColumn: new FormControl(''),
            timeStartFormat: new FormControl(''),
            timeStartFormatCustom: new FormControl(''), // TODO: validate format
            timeDurationColumn: new FormControl(''),
            timeDurationValue: new FormControl(0), // TODO: validate is positive integer
            timeEndColumn: new FormControl(''),
            timeEndFormat: new FormControl(''),
            timeEndFormatCustom: new FormControl(''), // TODO: validate format
            columnsX: new FormControl(''),
            columnsY: new FormControl(''),
            columnsText: new FormControl(''),
            columnsFloat: new FormControl(''),
            columnsInt: new FormControl(''),
            errorHandling: new FormControl('skip', Validators.required),
            spatialReference: new FormControl('EPSG:4326', Validators.required), // TODO: validate sref string
        });

        this.formNameDescription = new FormGroup({
            name: new FormControl('', Validators.required),
            description: new FormControl(''),
        });
    }

    changeTimeType(): void {
        const form = this.formMetaData.controls;
        const timeType = form.timeType.value;

        form.timeStartColumn.clearValidators();
        form.timeStartFormat.clearValidators();
        form.timeStartFormatCustom.clearValidators();
        form.timeDurationColumn.clearValidators();
        form.timeDurationValue.clearValidators();
        form.timeEndColumn.clearValidators();
        form.timeEndFormat.clearValidators();
        form.timeEndFormatCustom.clearValidators();

        if (timeType === 'Start') {
            form.timeStartColumn.setValidators(Validators.required);
            form.timeStartFormat.setValidators(Validators.required);
            form.timeDurationValue.setValidators(Validators.required);
        } else if (timeType === 'Start/Duration') {
            form.timeStartColumn.setValidators(Validators.required);
            form.timeStartFormat.setValidators(Validators.required);
            form.timeDurationColumn.setValidators(Validators.required);
        } else if (timeType === 'Start/End') {
            form.timeStartColumn.setValidators(Validators.required);
            form.timeStartFormat.setValidators(Validators.required);
            form.timeEndColumn.setValidators(Validators.required);
            form.timeEndFormat.setValidators(Validators.required);
        }

        form.timeStartColumn.updateValueAndValidity();
        form.timeStartFormat.updateValueAndValidity();
        form.timeStartFormatCustom.updateValueAndValidity();
        form.timeDurationColumn.updateValueAndValidity();
        form.timeDurationValue.updateValueAndValidity();
        form.timeEndColumn.updateValueAndValidity();
        form.timeEndFormat.updateValueAndValidity();
        form.timeEndFormatCustom.updateValueAndValidity();
    }

    changeTimeStartFormat(): void {
        const form = this.formMetaData.controls;
        if (form.timeStartFormat.value === 'Custom') {
            form.timeStartFormatCustom.setValidators(Validators.required);
        } else {
            form.timeStartFormatCustom.clearValidators();
        }
    }

    changeTimeEndFormat(): void {
        const form = this.formMetaData.controls;
        if (form.timeEndFormat.value === 'Custom') {
            form.timeEndFormatCustom.setValidators(Validators.required);
        } else {
            form.timeEndFormatCustom.clearValidators();
        }
    }

    removeText(column: string): void {
        const columns: Array<string> = this.formMetaData.controls.columnsText.value;

        const index = columns.indexOf(column);
        if (index > -1) {
            columns.splice(index, 1);
        }
    }

    addText(event: MatChipInputEvent): void {
        const columns: Array<string> = this.formMetaData.controls.columnsText.value;
        const column = event.value;
        const input = event.input;

        if (columns.indexOf(column)) {
            columns.push(column);
        }

        if (input) {
            input.value = '';
        }
    }

    removeInt(column: string): void {
        const columns: Array<string> = this.formMetaData.controls.columnsInt.value;

        const index = columns.indexOf(column);
        if (index > -1) {
            columns.splice(index, 1);
        }
    }

    addInt(event: MatChipInputEvent): void {
        const columns: Array<string> = this.formMetaData.controls.columnsInt.value;
        const column = event.value;
        const input = event.input;

        if (columns.indexOf(column)) {
            columns.push(column);
        }

        if (input) {
            input.value = '';
        }
    }

    removeFloat(column: string): void {
        const columns: Array<string> = this.formMetaData.controls.columnsFloat.value;

        const index = columns.indexOf(column);
        if (index > -1) {
            columns.splice(index, 1);
        }
    }

    addFloat(event: MatChipInputEvent): void {
        const columns: Array<string> = this.formMetaData.controls.columnsFloat.value;
        const column = event.value;
        const input = event.input;

        if (columns.indexOf(column)) {
            columns.push(column);
        }

        if (input) {
            input.value = '';
        }
    }

    upload(): void {
        if (!this.selectedFiles) {
            return;
        }

        const form = new FormData();

        for (const file of this.selectedFiles) {
            form.append('files[]', file, file.name);
        }

        this.datasetService.upload(form).subscribe(
            (event) => {
                if (event.type === HttpEventType.UploadProgress) {
                    const fraction = event.total ? event.loaded / event.total : 1;
                    this.progress$.next(Math.round(100 * fraction));
                } else if (event.type === HttpEventType.Response) {
                    const uploadId = event.body?.id as UUID;
                    this.uploadId = uploadId;
                    this.stepper.selected.completed = true;
                    this.stepper.selected.editable = false;
                    this.stepper.next();

                    this.suggest();
                }
            },
            (err) => {
                this.notificationService.error('File upload failed: ' + err.message);
            },
        );
    }

    addToMap(): void {
        if (!this.datasetId) {
            return;
        }

        this.datasetService
            .getDataset(this.datasetId)
            .pipe(mergeMap((dataset) => this.datasetService.addDatasetToMap(dataset)))
            .subscribe();
    }

    reloadSuggestion(): void {
        this.suggest(this.formMetaData.controls.mainFile.value);
    }

    submitCreate(): void {
        if (!this.uploadId) {
            return;
        }

        const formMeta = this.formMetaData.controls;
        const formDataset = this.formNameDescription.controls;

        const metaData: MetaDataDefinitionDict = {
            OgrMetaData: {
                loadingInfo: {
                    fileName: formMeta.mainFile.value,
                    layerName: formMeta.layerName.value,
                    dataType: formMeta.dataType.value,
                    time: this.getTime(),
                    columns: {
                        x: formMeta.columnsX.value,
                        y: formMeta.columnsY.value,
                        text: formMeta.columnsText.value,
                        float: formMeta.columnsFloat.value,
                        int: formMeta.columnsInt.value,
                    },
                    forceOgrTimeFilter: false,
                    onError: formMeta.errorHandling.value,
                    provenance: undefined, // TODO
                },
                resultDescriptor: {
                    dataType: formMeta.dataType.value,
                    spatialReference: formMeta.spatialReference.value,
                    columns: this.getColumnsAsMap(),
                },
            },
        };

        const addData: AddDatasetDict = {
            name: formDataset.name.value,
            description: formDataset.description.value,
            sourceOperator: 'OgrSource',
        };

        const definition: DatasetDefinitionDict = {
            properties: addData,
            metaData,
        };

        const create: CreateDatasetDict = {
            upload: this.uploadId,
            definition,
        };

        this.datasetService.createDataset(create).subscribe(
            (response) => {
                this.datasetId = response.id;
                this.stepper.selected.completed = true;
                this.stepper.selected.editable = false;
                const prevStep = this.stepper.steps.get(this.stepper.selectedIndex - 1);
                if (prevStep) {
                    prevStep.completed = true;
                    prevStep.editable = false;
                }

                this.stepper.next();

                this.suggest();
            },
            (err) => {
                this.notificationService.error('Create dataset failed: ' + err.message);
            },
        );
    }

    private suggest(mainFile: string | undefined = undefined): void {
        if (!this.uploadId) {
            return;
        }

        this.datasetService.suggestMetaData({upload: this.uploadId, mainFile}).subscribe(
            (suggest) => {
                const info = suggest.metaData.OgrMetaData?.loadingInfo;
                const start = this.getStartTime(info?.time);
                const end = this.getEndTime(info?.time);
                this.formMetaData.patchValue({
                    mainFile: suggest.mainFile,
                    layerName: info?.layerName,
                    dataType: info?.dataType,
                    timeType: info ? this.getTimeType(info.time) : 'None',
                    timeStartColumn: start ? start.startField : '',
                    timeStartFormat: start ? start.startFormat.format : '',
                    timeStartFormatCustom: start ? start.startFormat.customFormat : '',
                    timeDurationColumn: info?.time !== 'none' ? info?.time['start+duration']?.durationField : '',
                    timeDurationValue: info?.time !== 'none' ? info?.time.start?.duration : 0,
                    timeEndColumn: end ? end.endField : '',
                    timeEndFormat: end ? end.endFormat.format : '',
                    timeEndFormatCustom: end ? end.endFormat.customFormat : '',
                    columnsX: info?.columns?.x,
                    columnsY: info?.columns?.y,
                    columnsText: info?.columns?.text,
                    columnsFloat: info?.columns?.float,
                    columnsInt: info?.columns?.int,
                    errorHandling: info?.onError,
                    spatialReference: suggest.metaData.OgrMetaData?.resultDescriptor.spatialReference,
                });
                this.changeDetectorRef.markForCheck();
            },
            (err) => this.notificationService.error(err.message),
        );
    }

    private getStartTime(
        time: OgrSourceDatasetTimeTypeDict | undefined | 'none',
    ): undefined | {startField: string; startFormat: OgrSourceTimeFormatDict; custom?: string} {
        if (!time || time === 'none') {
            return undefined;
        }

        if (time.start) {
            return time.start;
        } else if (time['start+duration']) {
            return time['start+duration'];
        } else if (time['start+end']) {
            return time['start+end'];
        }

        return undefined;
    }

    private getEndTime(
        time: OgrSourceDatasetTimeTypeDict | undefined | 'none',
    ): undefined | {endField: string; endFormat: OgrSourceTimeFormatDict; custom?: string} {
        if (!time || time === 'none') {
            return undefined;
        }

        if (time['start+end']) {
            return time['start+end'];
        }

        return undefined;
    }

    private getColumnsAsMap(): {[key: string]: 'categorical' | 'int' | 'float' | 'text'} {
        const formMeta = this.formMetaData.controls;
        const columns: {[key: string]: 'categorical' | 'int' | 'float' | 'text'} = {};

        for (const column of formMeta.columnsText.value as Array<string>) {
            columns[column] = 'text';
        }

        for (const column of formMeta.columnsInt.value as Array<string>) {
            columns[column] = 'int';
        }

        for (const column of formMeta.columnsFloat.value as Array<string>) {
            columns[column] = 'float';
        }
        return columns;
    }

    private getTime(): 'none' | OgrSourceDatasetTimeTypeDict {
        const formMeta = this.formMetaData.controls;
        let time: 'none' | OgrSourceDatasetTimeTypeDict = 'none';

        if (formMeta.timeType.value === 'Start') {
            const format: OgrSourceTimeFormatDict = {
                format: formMeta.timeStartFormat.value.toLowerCase(),
            };

            if (format.format === 'custom') {
                format.customFormat = formMeta.timeStartFormatCustom.value;
            }

            time = {
                start: {
                    startField: formMeta.timeStartColumn.value,
                    startFormat: format,
                    duration: formMeta.timeDurationValue.value,
                },
            };
        } else if (formMeta.timeType.value === 'Start/End') {
            const startFormat: OgrSourceTimeFormatDict = {
                format: formMeta.timeStartFormat.value.toLowerCase(),
            };

            if (startFormat.format === 'custom') {
                startFormat.customFormat = formMeta.timeStartFormatCustom.value;
            }

            const endFormat: OgrSourceTimeFormatDict = {
                format: formMeta.timeStartFormat.value.toLowerCase(),
            };

            if (endFormat.format === 'custom') {
                endFormat.customFormat = formMeta.timeStartFormatCustom.value;
            }

            time = {
                'start+end': {
                    startField: formMeta.timeStartColumn.value,
                    startFormat,
                    endField: formMeta.timeEndColumn.value,
                    endFormat,
                },
            };
        } else if (formMeta.timeType.value === 'Start/Duration') {
            const format: OgrSourceTimeFormatDict = {
                format: formMeta.timeStartFormat.value.toLowerCase(),
            };

            if (format.format === 'custom') {
                format.customFormat = formMeta.timeStartFormatCustom.value;
            }

            time = {
                'start+duration': {
                    startField: formMeta.timeStartColumn.value,
                    startFormat: format,
                    durationField: formMeta.timeDurationColumn.value,
                },
            };
        }
        return time;
    }

    private getTimeType(time: 'none' | OgrSourceDatasetTimeTypeDict): string {
        if (time === 'none') {
            return 'None';
        }
        if (time.start) {
            return 'Start';
        } else if (time['start+duration']) {
            return 'Start/Duration';
        } else if (time['start+end']) {
            return 'Start/End';
        }
        return 'None';
    }
}
