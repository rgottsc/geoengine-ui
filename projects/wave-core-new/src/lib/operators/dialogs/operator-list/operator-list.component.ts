import {BehaviorSubject, combineLatest, Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';

import {ChangeDetectionStrategy, Component, Input, OnInit, Type} from '@angular/core';
// import {RasterValueExtractionType} from '../../types/raster-value-extraction-type.model';
//
// import {NumericAttributeFilterType} from '../../types/numeric-attribute-filter-type.model';
// import {NumericAttributeFilterOperatorComponent} from '../numeric-attribute-filter/numeric-attribute-filter.component';
//
// import {PointInPolygonFilterType} from '../../types/point-in-polygon-filter-type.model';
// import {PointInPolygonFilterOperatorComponent} from '../point-in-polygon-filter/point-in-polygon-filter.component';
//
import {ExpressionOperatorComponent} from '../expression-operator/expression-operator.component';
//
// import {HistogramType} from '../../types/histogram-type.model';
// import {RasterValueExtractionOperatorComponent} from '../raster-value-extraction/raster-value-extraction.component';
// import {HistogramOperatorComponent} from '../histogram-operator/histogram-operator.component';
import {LayoutService} from '../../../layout.service';
// import {ROperatorComponent} from '../r/r-operator/r-operator.component';
// import {RScriptType} from '../../types/r-script-type.model';
// import {PieChartComponent} from '../pie-chart-operator/pie-chart-operator.component';
// import {PieChartType} from '../../types/piechart-type.model';
// import {ScatterPlotComponent} from '../scatter-plot-operator/scatter-plot-operator.component';
// import {ScatterPlotType} from '../../types/scatterplot-type.model';
// import {TextualAttributeFilterOperatorComponent} from '../textual-attribute-filter/textual-attribute-filter.component';
// import {TextualAttributeFilterType} from '../../types/textual-attribute-filter-type.model';
// import {BoxPlotComponent} from '../box-plot-operator/box-plot-operator.component';
// import {BoxPlotType} from '../../types/boxplot-type.model';
// import {RasterPolygonClipOperatorComponent} from '../raster-polygon-clip/raster-polygon-clip.component';
// import {OperatorType} from '../../operator-type.model';
// import {HeatmapOperatorComponent} from '../heatmap/heatmap.component';
// import {HeatmapType} from '../../types/heatmap-type.model';
// import {TimePlotType} from '../../types/timeplot-type.model';
// import {TimePlotComponent} from '../time-plot-operator/time-plot-operator.component';
// import {StatisticsType} from '../../types/statistics-type.model';
import {StatisticsPlotComponent} from '../statistics-plot/statistics-plot.component';
import {createIconDataUrl} from '../../../util/icons';
import {HistogramOperatorComponent} from '../histogram-operator/histogram-operator.component';
// eslint-disable-next-line max-len
import {MeanRasterPixelValuesOverTimeDialogComponent} from '../mean-raster-pixel-values-over-time-dialog/mean-raster-pixel-values-over-time-dialog.component';
import {PointInPolygonFilterOperatorComponent} from '../point-in-polygon-filter/point-in-polygon-filter.component';
import {RasterVectorJoinComponent} from '../raster-vector-join/raster-vector-join.component';
import {FeatureAttributeOvertimeComponent} from '../feature-attribute-over-time/feature-attribute-over-time.component';
import {TemporalRasterAggregationComponent} from '../temporal-raster-aggregation/temporal-raster-aggregation.component';
// import {RgbCompositeComponent} from '../rgb-composite/rgb-composite.component';
// import {RgbaCompositeType} from '../../types/rgba-composite-type.model';
// import {RasterMaskComponent} from '../raster-mask/raster-mask.component';

/**
 * This type encapsulates…
 *  * a component to select,
 *  * a type to display (name and icon) and
 *  * a short description text.
 */
export interface OperatorListType {
    component: Type<any>;
    type: {NAME: string; ICON_URL: string};
    description: string;
}

/**
 * This types groups operator list types
 */
export type OperatorListButtonGroups = Array<{
    name: string;
    list: Array<OperatorListType>;
}>;

/**
 * This component provides a list of operator dialogs to choose from.
 *
 * It provides a set of default operators but they can be overridden.
 */
@Component({
    selector: 'wave-operator-list',
    templateUrl: './operator-list.component.html',
    styleUrls: ['./operator-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorListComponent implements OnInit {
    static readonly DEFAULT_MIXED_OPERATOR_DIALOGS: Array<OperatorListType> = [
        {
            component: RasterVectorJoinComponent,
            type: {
                NAME: 'Raster Vector Join',
                ICON_URL: createIconDataUrl('Raster Vector Join'),
            },
            description: 'Attach raster values to multi-point data',
        },
        // {
        //     component: RasterPolygonClipOperatorComponent,
        //     type: {
        //         NAME: 'Raster Polygon Clip',
        //         ICON_URL: OperatorType.createIconDataUrl('Raster Polygon Clip'),
        //     },
        //     description: 'Clip a raster image via polygon boundaries',
        // },
        // {
        //     component: ROperatorComponent,
        //     type: RScriptType,
        //     description: 'Execute an R script (experimental)'
        // }
    ];

    static readonly DEFAULT_PLOT_OPERATOR_DIALOGS: Array<OperatorListType> = [
        {
            component: HistogramOperatorComponent,
            type: {
                NAME: 'Histogram',
                ICON_URL: createIconDataUrl('Histogram'),
            },
            description: 'Create a histogram from vector or raster data',
        },
        //     {
        //         component: PieChartComponent,
        //         type: PieChartType,
        //         description: 'Plot your data as a pie chart',
        //     },
        //     {
        //         component: ScatterPlotComponent,
        //         type: ScatterPlotType,
        //         description: 'Scatter plot your data'
        //     },
        //     {
        //         component: BoxPlotComponent,
        //         type: BoxPlotType,
        //         description: 'Box plot your data'
        //     },
        {
            component: StatisticsPlotComponent,
            type: {
                NAME: 'Basic Statistics',
                ICON_URL: createIconDataUrl('Basic Statistics'),
            },
            description: 'Get statistics for raster layer',
        },
        {
            component: MeanRasterPixelValuesOverTimeDialogComponent,
            type: {
                NAME: 'Temporal Raster Mean Plot',
                ICON_URL: createIconDataUrl('Temporal Raster Mean Plot'),
            },
            description: 'Create an area chart over the mean pixel values of the images of a raster time series',
        },
        {
            component: FeatureAttributeOvertimeComponent,
            type: {
                NAME: 'Temporal Feature Attribute Plot',
                ICON_URL: createIconDataUrl('Temporal Feature Attribute Plot'),
            },
            description: 'Create a multi line chart over the attribute values of a feature layer',
        },
    ];

    static readonly DEFAULT_RASTER_OPERATOR_DIALOGS: Array<OperatorListType> = [
        {
            component: ExpressionOperatorComponent,
            type: {
                NAME: 'Expression',
                ICON_URL: 'assets/operator-type-icons/expression.png',
            },
            description: 'Calculate an expression on a raster',
        },
        {
            component: TemporalRasterAggregationComponent,
            type: {
                NAME: 'Temporal Raster Aggregation',
                ICON_URL: createIconDataUrl('Temporal Raster Aggregation'),
            },
            description: 'Aggregate raster time series',
        },
        // {
        //     component: RasterMaskComponent,
        //     type: {
        //         NAME: 'Raster Mask',
        //         ICON_URL: OperatorType.createIconDataUrl('Raster Mask'),
        //     },
        //     description: 'Apply a mask to a raster',
        // },
        // {
        //     component: RgbCompositeComponent,
        //     type: RgbaCompositeType,
        //     description: 'Create an RGB composite from a set of rasters',
        // }
    ];

    static readonly DEFAULT_VECTOR_OPERATOR_DIALOGS: Array<OperatorListType> = [
        // {
        //     component: NumericAttributeFilterOperatorComponent,
        //     type: NumericAttributeFilterType,
        //     description: 'Filter data via numeric range',
        // },
        // {
        //     component: HeatmapOperatorComponent,
        //     type: HeatmapType,
        //     description: 'Create a heatmap for points',
        // },
        {
            component: PointInPolygonFilterOperatorComponent,
            type: {
                NAME: 'Point in Polygon',
                ICON_URL: createIconDataUrl('Point in Polygon'),
            },
            description: 'Filter points that are enclosed by a polygon',
        },
        // {
        //     component: TextualAttributeFilterOperatorComponent,
        //     type: TextualAttributeFilterType,
        //     description: 'Filter data via text filter',
        // },
    ];

    /**
     * Specify (optionally) a custom set of operator groups and list entries (buttons)
     */
    @Input() operators: OperatorListButtonGroups = [
        // default operator set
        {name: 'Mixed', list: OperatorListComponent.DEFAULT_MIXED_OPERATOR_DIALOGS},
        {name: 'Plots', list: OperatorListComponent.DEFAULT_PLOT_OPERATOR_DIALOGS},
        {name: 'Raster', list: OperatorListComponent.DEFAULT_RASTER_OPERATOR_DIALOGS},
        {name: 'Vector', list: OperatorListComponent.DEFAULT_VECTOR_OPERATOR_DIALOGS},
    ];

    operatorGroups$: Observable<Array<{name: string; list: Array<OperatorListType>}>>;
    searchString$ = new BehaviorSubject<string>('');

    /**
     * DI of services
     */
    constructor(private layoutService: LayoutService) {
        this.operatorGroups$ = combineLatest([of(this.operators), this.searchString$.pipe(map((s) => s.toLowerCase()))]).pipe(
            map(([operatorGroups, searchString]) => {
                const nameComparator = (a: string, b: string): number => {
                    const stripped = (s: string): string => s.replace(' ', '');

                    return stripped(a).localeCompare(stripped(b));
                };

                const filteredGroups = [];
                for (const group of operatorGroups) {
                    const operators = [];
                    for (const operator of group.list) {
                        const searchMatchesTypeName = (): boolean => operator.type.NAME.toLowerCase().includes(searchString);
                        const searchMatchesDescription = (): boolean => operator.description.toLowerCase().includes(searchString);

                        if (searchMatchesTypeName() || searchMatchesDescription()) {
                            operators.push(operator);
                        }
                    }

                    if (operators.length > 0) {
                        filteredGroups.push({
                            name: group.name,
                            list: operators.sort((a, b) => nameComparator(a.type.NAME, b.type.NAME)),
                        });
                    }
                }

                return filteredGroups.sort((a, b) => nameComparator(a.name, b.name));
            }),
        );
    }

    ngOnInit(): void {}

    /**
     * Load a selected dialog into the sidenav
     */
    load(component: Type<any>): void {
        this.layoutService.setSidenavContentComponent({component, keepParent: true});
    }
}
