import {Color, colorToDict, RgbaTuple, rgbaColorFromDict} from '../../colors/color';
import {Feature as OlFeature} from 'ol';
import {
    ColorParamDict,
    DerivedColorDict,
    DerivedNumberDict,
    LineSymbologyDict,
    NumberParamDict,
    PointSymbologyDict,
    PolygonSymbologyDict,
    RasterSymbologyDict,
    StrokeParamDict,
    SymbologyDict,
    TextSymbologyDict,
    VectorSymbologyDict,
} from '../../backend/backend.model';
import {Circle as OlStyleCircle, Fill as OlStyleFill, Stroke as OlStyleStroke, Style as OlStyle, Text as OlStyleText} from 'ol/style';
import {StyleFunction as OlStyleFunction} from 'ol/style/Style';
import {Colorizer} from '../../colors/colorizer.model';
import {PointIconStyle} from '../layer-icons/point-icon/point-icon.component';
import {LineIconStyle} from '../layer-icons/line-icon/line-icon.component';
import {PolygonIconStyle} from '../layer-icons/polygon-icon/polygon-icon.component';
import {FeatureLike} from 'ol/Feature';

/**
 * List of the symbology types used in WAVE
 */
export enum SymbologyType {
    RASTER,
    POINT,
    LINE,
    POLYGON,
}

// List of constants used by layer symbology.
export const DEFAULT_VECTOR_STROKE_COLOR: Color = Color.fromRgbaLike([0, 0, 0, 1]);
export const DEFAULT_VECTOR_FILL_COLOR: Color = Color.fromRgbaLike([255, 0, 0, 1]);
export const DEFAULT_VECTOR_HIGHLIGHT_STROKE_COLOR: Color = Color.fromRgbaLike([255, 255, 255, 1]);
export const DEFAULT_VECTOR_HIGHLIGHT_FILL_COLOR: Color = Color.fromRgbaLike([0, 153, 255, 1]);
export const DEFAULT_VECTOR_HIGHLIGHT_TEXT_COLOR: Color = Color.fromRgbaLike([255, 255, 255, 1]);
export const DEFAULT_POINT_RADIUS = 8;
export const DEFAULT_POINT_CLUSTER_RADIUS_ATTRIBUTE = '___radius';
export const DEFAULT_POINT_CLUSTER_TEXT_ATTRIBUTE = '___numberOfPoints';
export const MIN_ALLOWED_POINT_RADIUS = 1;
export const MAX_ALLOWED_POINT_RADIUS = 100;
export const MAX_ALLOWED_TEXT_LENGTH = 25;

// export type StrokeDashStyle = Array<number>;

const STYLE_CACHE: {[key: string]: OlStyle} = {};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IconStyle {}

export abstract class Symbology {
    static fromDict(dict: SymbologyDict): Symbology {
        if (dict.raster) {
            return RasterSymbology.fromRasterSymbologyDict(dict.raster);
        } else if (dict.vector) {
            const vectorDict = dict.vector;
            if (vectorDict.point) {
                return PointSymbology.fromPointSymbologyDict(vectorDict.point);
            } else if (vectorDict.line) {
                return LineSymbology.fromLineSymbologyDict(vectorDict.line);
            } else if (vectorDict.polygon) {
                return PolygonSymbology.fromPolygonSymbologyDict(vectorDict.polygon);
            }
        }
        throw new Error('Invalid Symbology type.');
    }

    abstract toDict(): SymbologyDict;

    abstract clone(): Symbology;

    abstract equals(other: Symbology): boolean;

    abstract getSymbologyType(): SymbologyType;

    abstract getIconStyle(): IconStyle;

    get iconStyle(): IconStyle {
        return this.getIconStyle();
    }

    get symbologyType(): SymbologyType {
        return this.getSymbologyType();
    }
}

export abstract class VectorSymbology extends Symbology {
    static fromVectorSymbologyDict(dict: VectorSymbologyDict): VectorSymbology {
        if (dict.point) {
            return PointSymbology.fromPointSymbologyDict(dict.point);
        } else if (dict.line) {
            return LineSymbology.fromLineSymbologyDict(dict.line);
        } else if (dict.polygon) {
            return PolygonSymbology.fromPolygonSymbologyDict(dict.polygon);
        }
        throw new Error('Invalid Vector Symbology type.');
    }

    createStyleFunction(): OlStyleFunction {
        return (feature: FeatureLike, _resolution: number): OlStyle => {
            const styler = this.createStyler((feature as unknown) as OlFeature);

            const key = styler.cacheKey();
            if (key in STYLE_CACHE) {
                return STYLE_CACHE[key];
            } else {
                const style = styler.createStyle();
                STYLE_CACHE[key] = style;
                return style;
            }
        };
    }

    createStyle(feature: OlFeature): OlStyle {
        return this.createStyler(feature).createStyle();
    }

    createHighlightStyle(feature: OlFeature): OlStyle {
        return this.createStyler(feature).createHighlightStyle();
    }

    abstract clone(): VectorSymbology;

    protected abstract createStyler(feature: OlFeature): Styler;
}

export abstract class Styler {
    abstract createStyle(): OlStyle;
    abstract createHighlightStyle(): OlStyle;
    abstract cacheKey(): string;

    static invertColor(color: RgbaTuple): RgbaTuple {
        return [255 - color[0], 255 - color[1], 255 - color[2], color[3]];
    }

    static colorToKey(color: RgbaTuple): string {
        return `${color[0]}${color[1]}${color[2]}${color[3]}`;
    }
}

export class PointStyler extends Styler {
    radius: number;
    fillColor: RgbaTuple;
    stroke: StrokeStyler;
    text?: TextStyler;

    constructor(radius: number, fillColor: RgbaTuple, stroke: StrokeStyler, text?: TextStyler) {
        super();
        this.radius = radius;
        this.fillColor = fillColor;
        this.stroke = stroke;
        this.text = text;
    }

    createStyle(): OlStyle {
        const imageStyle = new OlStyleCircle({
            radius: this.radius,
            fill: new OlStyleFill({color: this.fillColor}),
            stroke: (this.stroke.createStyle() as unknown) as OlStyleStroke,
        });

        return new OlStyle({
            image: imageStyle,
            text: this.text ? ((this.text.createStyle() as unknown) as OlStyleText) : undefined,
        });
    }

    createHighlightStyle(): OlStyle {
        const imageStyle = new OlStyleCircle({
            radius: this.radius,
            fill: new OlStyleFill({color: Styler.invertColor(this.fillColor)}),
            stroke: (this.stroke.createHighlightStyle() as unknown) as OlStyleStroke,
        });

        return new OlStyle({
            image: imageStyle,
            text: this.text ? ((this.text.createHighlightStyle() as unknown) as OlStyleText) : undefined,
        });
    }

    cacheKey(): string {
        return `${this.radius}${Styler.colorToKey(this.fillColor)}${this.stroke.cacheKey()}${this.text ? this.text.cacheKey() : ''}`;
    }
}

export class LineStyler extends Styler {
    stroke: StrokeStyler;
    text?: TextStyler;

    constructor(stroke: StrokeStyler, text?: TextStyler) {
        super();
        this.stroke = stroke;
        this.text = text;
    }

    createStyle(): OlStyle {
        return new OlStyle({
            stroke: (this.stroke.createStyle() as unknown) as OlStyleStroke,
            text: this.text ? ((this.text.createStyle() as unknown) as OlStyleText) : undefined,
        });
    }

    createHighlightStyle(): OlStyle {
        return new OlStyle({
            stroke: (this.stroke.createHighlightStyle() as unknown) as OlStyleStroke,
            text: this.text ? ((this.text.createHighlightStyle() as unknown) as OlStyleText) : undefined,
        });
    }

    cacheKey(): string {
        return `${this.stroke.cacheKey()}${this.text ? this.text.cacheKey() : ''}`;
    }
}

export class PolygonStyler extends Styler {
    fillColor: RgbaTuple;
    stroke: StrokeStyler;
    text?: TextStyler;

    constructor(fillColor: RgbaTuple, stroke: StrokeStyler, text?: TextStyler) {
        super();
        this.fillColor = fillColor;
        this.stroke = stroke;
        this.text = text;
    }

    createStyle(): OlStyle {
        return new OlStyle({
            fill: new OlStyleFill({color: this.fillColor}),
            stroke: (this.stroke.createStyle() as unknown) as OlStyleStroke,
            text: this.text ? ((this.text.createStyle() as unknown) as OlStyleText) : undefined,
        });
    }

    createHighlightStyle(): OlStyle {
        return new OlStyle({
            fill: new OlStyleFill({color: Styler.invertColor(this.fillColor)}),
            stroke: (this.stroke.createHighlightStyle() as unknown) as OlStyleStroke,
            text: this.text ? ((this.text.createHighlightStyle() as unknown) as OlStyleText) : undefined,
        });
    }

    cacheKey(): string {
        return `${Styler.colorToKey(this.fillColor)}${this.stroke.cacheKey()}${this.text ? this.text.cacheKey() : ''}`;
    }
}

export class StrokeStyler extends Styler {
    width: number;
    color: RgbaTuple;

    constructor(width: number, color: RgbaTuple) {
        super();
        this.width = width;
        this.color = color;
    }

    createStyle(): OlStyle {
        return (new OlStyleStroke({
            color: this.color,
            width: this.width,
        }) as unknown) as OlStyle;
    }

    createHighlightStyle(): OlStyle {
        return (new OlStyleStroke({
            color: Styler.invertColor(this.color),
            width: this.width,
        }) as unknown) as OlStyle;
    }

    cacheKey(): string {
        return `${this.width}${Styler.colorToKey(this.color)}`;
    }
}

export class TextStyler extends Styler {
    text: string;
    fillColor: RgbaTuple;
    stroke: StrokeStyler;

    constructor(text: string, fillColor: RgbaTuple, stroke: StrokeStyler) {
        super();
        this.text = text;
        this.fillColor = fillColor;
        this.stroke = stroke;
    }

    createStyle(): OlStyle {
        return (new OlStyleText({
            text: this.text.slice(0, MAX_ALLOWED_TEXT_LENGTH),
            fill: new OlStyleFill({
                color: this.fillColor,
            }),
            stroke: (this.stroke.createStyle() as unknown) as OlStyleStroke,
        }) as unknown) as OlStyle;
    }

    createHighlightStyle(): OlStyle {
        return (new OlStyleText({
            text: this.text.slice(0, MAX_ALLOWED_TEXT_LENGTH),
            fill: new OlStyleFill({
                color: Styler.invertColor(this.fillColor),
            }),
            stroke: (this.stroke.createHighlightStyle() as unknown) as OlStyleStroke,
        }) as unknown) as OlStyle;
    }

    cacheKey(): string {
        return `${this.text}${Styler.colorToKey(this.fillColor)}${this.stroke.cacheKey()}`;
    }
}

export class PointSymbology extends VectorSymbology {
    // TODO: visiblity
    radius: NumberParam;
    fillColor: ColorParam;
    stroke: Stroke;

    text?: TextSymbology;

    constructor(radius: NumberParam, fillColor: ColorParam, stroke: Stroke, text?: TextSymbology) {
        super();
        this.radius = radius;
        this.fillColor = fillColor;
        this.stroke = stroke;
        this.text = text;
    }

    static fromPointSymbologyDict(dict: PointSymbologyDict): PointSymbology {
        return new PointSymbology(
            NumberParam.fromDict(dict.radius),
            ColorParam.fromDict(dict.fillColor),
            Stroke.fromDict(dict.stroke),
            dict.text ? TextSymbology.fromDict(dict.text) : undefined,
        );
    }

    createStyler(feature: OlFeature): PointStyler {
        return new PointStyler(
            this.radius.getNumber(feature),
            this.fillColor.getColor(feature).rgbaTuple(),
            this.stroke.createStyler(feature),
            this.text ? ((this.text.createStyler(feature) as unknown) as TextStyler) : undefined,
        );
    }

    equals(other: PointSymbology): boolean {
        return (
            other instanceof PointSymbology &&
            this.radius.equals(other.radius) &&
            this.fillColor.equals(other.fillColor) &&
            this.stroke.equals(other.stroke) &&
            textSymbologyEquality(this.text, other.text)
        );
    }

    clone(): PointSymbology {
        return new PointSymbology(
            this.radius.clone(),
            this.fillColor.clone(),
            this.stroke.clone(),
            this.text ? this.text.clone() : undefined,
        );
    }

    toDict(): SymbologyDict {
        return {
            vector: {
                point: {
                    radius: this.radius.toDict(),
                    fillColor: this.fillColor.toDict(),
                    stroke: this.stroke.toDict(),
                    text: this.text ? this.text.toDict() : undefined,
                },
            },
        };
    }

    getSymbologyType(): SymbologyType {
        return SymbologyType.POINT;
    }

    getIconStyle(): PointIconStyle {
        return {
            strokeWidth: this.stroke.width.getDefault(),
            // strokeDashStyle: StrokeDashStyle;
            strokeRGBA: this.stroke.color.getDefault(),
            fillRGBA: this.fillColor.getDefault(),
        };
    }
}

export class LineSymbology extends VectorSymbology {
    stroke: Stroke;
    text?: TextSymbology;

    constructor(stroke: Stroke, text?: TextSymbology) {
        super();
        this.stroke = stroke;
        this.text = text;
    }

    static fromLineSymbologyDict(dict: LineSymbologyDict): LineSymbology {
        return new LineSymbology(Stroke.fromDict(dict.stroke), dict.text ? TextSymbology.fromDict(dict.text) : undefined);
    }

    createStyler(feature: OlFeature): Styler {
        return new LineStyler(
            this.stroke.createStyler(feature),
            this.text ? ((this.text.createStyler(feature) as unknown) as TextStyler) : undefined,
        );
    }

    equals(other: LineSymbology): boolean {
        return other instanceof LineSymbology && this.stroke.equals(other.stroke) && textSymbologyEquality(this.text, other.text);
    }

    clone(): LineSymbology {
        return new LineSymbology(this.stroke.clone(), this.text ? this.text.clone() : undefined);
    }

    toDict(): SymbologyDict {
        return {
            vector: {
                line: {
                    stroke: this.stroke.toDict(),
                    text: this.text ? this.text.toDict() : undefined,
                },
            },
        };
    }

    getSymbologyType(): SymbologyType {
        return SymbologyType.LINE;
    }

    getIconStyle(): LineIconStyle {
        return {
            strokeWidth: this.stroke.width.getDefault(),
            // strokeDashStyle: StrokeDashStyle;
            strokeRGBA: this.stroke.color.getDefault(),
        };
    }
}

export class PolygonSymbology extends VectorSymbology {
    fillColor: ColorParam;
    stroke: Stroke;

    text?: TextSymbology;

    constructor(fillColor: ColorParam, stroke: Stroke, text?: TextSymbology) {
        super();
        this.fillColor = fillColor;
        this.stroke = stroke;
        this.text = text;
    }

    static fromPolygonSymbologyDict(dict: PolygonSymbologyDict): PolygonSymbology {
        return new PolygonSymbology(
            ColorParam.fromDict(dict.fillColor),
            Stroke.fromDict(dict.stroke),
            dict.text ? TextSymbology.fromDict(dict.text) : undefined,
        );
    }

    createStyler(feature: OlFeature): Styler {
        return new PolygonStyler(
            this.fillColor.getColor(feature).rgbaTuple(),
            this.stroke.createStyler(feature),
            this.text ? ((this.text.createStyler(feature) as unknown) as TextStyler) : undefined,
        );
    }

    equals(other: PolygonSymbology): boolean {
        return (
            other instanceof PolygonSymbology &&
            this.fillColor.equals(other.fillColor) &&
            this.stroke.equals(other.stroke) &&
            textSymbologyEquality(this.text, other.text)
        );
    }

    clone(): PolygonSymbology {
        return new PolygonSymbology(this.fillColor.clone(), this.stroke.clone(), this.text ? this.text.clone() : undefined);
    }

    toDict(): SymbologyDict {
        return {
            vector: {
                polygon: {
                    fillColor: this.fillColor.toDict(),
                    stroke: this.stroke.toDict(),
                    text: this.text ? this.text.toDict() : undefined,
                },
            },
        };
    }

    getSymbologyType(): SymbologyType {
        return SymbologyType.POLYGON;
    }

    getIconStyle(): PolygonIconStyle {
        return {
            strokeWidth: this.stroke.width.getDefault(),
            // strokeDashStyle: StrokeDashStyle;
            strokeRGBA: this.stroke.color.getDefault(),
            fillRGBA: this.fillColor.getDefault(),
        };
    }
}

export class RasterSymbology extends Symbology {
    readonly opacity: number;
    readonly colorizer: Colorizer;

    constructor(opacity: number, colorizer: Colorizer) {
        super();
        this.opacity = opacity;
        this.colorizer = colorizer;
    }

    static fromRasterSymbologyDict(dict: RasterSymbologyDict): RasterSymbology {
        return new RasterSymbology(dict.opacity, Colorizer.fromDict(dict.colorizer));
    }

    equals(other: RasterSymbology): boolean {
        return (
            other instanceof RasterSymbology && this.opacity === other.opacity && this.colorizer.equals(other.colorizer) //&&
        );
    }

    clone(): RasterSymbology {
        return new RasterSymbology(this.opacity, this.colorizer.clone());
    }

    cloneWith(updates: {readonly opacity?: number; readonly colorizer?: Colorizer}): RasterSymbology {
        return new RasterSymbology(updates.opacity ?? this.opacity, updates.colorizer ?? this.colorizer.clone());
    }

    toDict(): SymbologyDict {
        return {
            raster: {
                opacity: this.opacity,
                colorizer: this.colorizer.toDict(),
            },
        };
    }

    getSymbologyType(): SymbologyType {
        return SymbologyType.RASTER;
    }

    getIconStyle(): IconStyle {
        throw new Error('Raster has custom icon renderer.');
    }
}

export abstract class ColorParam {
    static fromDict(dict: ColorParamDict): ColorParam {
        if (dict.static) {
            return new StaticColor(Color.fromRgbaLike(rgbaColorFromDict(dict.static)));
        } else if (dict.derived) {
            return DerivedColor.fromDerivedColorDict(dict.derived);
        } else {
            throw new Error('unable to deserialize `NumberParam`');
        }
    }

    abstract equals(other: ColorParam): boolean;

    abstract clone(): ColorParam;

    abstract toDict(): ColorParamDict;

    abstract getColor(feature: OlFeature): Color;

    abstract getDefault(): Color;
}

export abstract class NumberParam {
    static fromDict(dict: NumberParamDict): NumberParam {
        if (dict.static) {
            return new StaticNumber(dict.static);
        } else if (dict.derived) {
            return DerivedNumber.fromDerivedNumberDict(dict.derived);
        } else {
            throw new Error('unable to deserialize `NumberParam`');
        }
    }

    abstract equals(other: NumberParam): boolean;

    abstract clone(): NumberParam;

    abstract toDict(): NumberParamDict;

    abstract getNumber(feature: OlFeature): number;

    abstract getDefault(): number;
}

export class StaticColor extends ColorParam {
    color: Color;

    constructor(color: Color) {
        super();
        this.color = color;
    }

    getColor(_feature: OlFeature): Color {
        return this.color;
    }

    equals(other: ColorParam): boolean {
        if (other instanceof StaticColor) {
            return this.color.equals(other.color);
        }
        return false;
    }

    clone(): ColorParam {
        return new StaticColor(this.color.clone());
    }

    toDict(): ColorParamDict {
        return {
            static: colorToDict(this.color),
        };
    }

    getDefault(): Color {
        return this.color;
    }
}

export class StaticNumber extends NumberParam {
    num: number;

    constructor(num: number) {
        super();
        this.num = num;
    }

    getNumber(_feature: OlFeature): number {
        return this.num;
    }

    equals(other: NumberParam): boolean {
        if (other instanceof StaticNumber) {
            return this.num === other.num;
        }
        return false;
    }

    clone(): NumberParam {
        return new StaticNumber(this.num);
    }

    toDict(): NumberParamDict {
        return {
            static: this.num,
        };
    }

    getDefault(): number {
        return this.num;
    }
}

export class DerivedColor implements ColorParam {
    attribute: string;
    colorizer: Colorizer;

    constructor(attribute: string, colorizer: Colorizer) {
        this.attribute = attribute;
        this.colorizer = colorizer;
    }

    static fromDerivedColorDict(dict: DerivedColorDict): DerivedColor {
        return new DerivedColor(dict.attribute, Colorizer.fromDict(dict.colorizer));
    }

    getColor(feature: OlFeature): Color {
        return this.colorizer.getColor(feature.get(this.attribute));
    }

    equals(other: ColorParam): boolean {
        if (other instanceof DerivedColor) {
            return this.attribute === other.attribute && this.colorizer.equals(other.colorizer);
        }
        return false;
    }

    clone(): ColorParam {
        return new DerivedColor(this.attribute, this.colorizer.clone()) as ColorParam;
    }

    toDict(): ColorParamDict {
        return {
            derived: {
                attribute: this.attribute,
                colorizer: this.colorizer.toDict(),
            },
        };
    }

    getDefault(): Color {
        return this.colorizer.defaultColor;
    }
}

export class DerivedNumber extends NumberParam {
    attribute: string;
    factor: number;
    defaultValue: number;

    constructor(attribute: string, factor: number, defaultValue: number) {
        super();
        this.attribute = attribute;
        this.factor = factor;
        this.defaultValue = defaultValue;
    }

    static fromDerivedNumberDict(dict: DerivedNumberDict): NumberParam {
        return new DerivedNumber(dict.attribute, dict.factor, dict.defaultValue);
    }

    getNumber(feature: OlFeature): number {
        const value = feature.get(this.attribute) * this.factor;
        // ensure to only have values >= 0
        return Math.max(value, 0);
    }

    equals(other: NumberParam): boolean {
        if (other instanceof DerivedNumber) {
            return this.attribute === other.attribute && this.factor === other.factor;
        }
        return false;
    }

    clone(): NumberParam {
        return new DerivedNumber(this.attribute, this.factor, this.defaultValue);
    }

    toDict(): NumberParamDict {
        return {
            derived: {
                attribute: this.attribute,
                factor: this.factor,
                defaultValue: this.defaultValue,
            },
        };
    }

    getDefault(): number {
        return this.defaultValue;
    }
}

export class Stroke {
    width: NumberParam;
    color: ColorParam;
    // TODO: dash

    constructor(width: NumberParam, color: ColorParam) {
        this.width = width;
        this.color = color;
    }

    static fromDict(dict: StrokeParamDict): Stroke {
        return new Stroke(NumberParam.fromDict(dict.width), ColorParam.fromDict(dict.color));
    }

    createStyle(feature: OlFeature): OlStyleStroke {
        return new OlStyleStroke({
            color: this.color.getColor(feature).rgbTuple(),
            width: this.width.getNumber(feature),
        });
    }

    equals(other: Stroke): boolean {
        return this.width.equals(other.width) && this.color.equals(other.color);
    }

    clone(): Stroke {
        return new Stroke(this.width.clone(), this.color.clone());
    }

    toDict(): StrokeParamDict {
        return {
            width: this.width.toDict(),
            color: this.color.toDict(),
        };
    }

    createStyler(feature: OlFeature): StrokeStyler {
        return new StrokeStyler(this.width.getNumber(feature), this.color.getColor(feature).rgbaTuple());
    }
}

export class TextSymbology {
    attribute: string;
    fillColor: ColorParam;
    stroke: Stroke;

    constructor(attribute: string, fillColor: ColorParam, stroke: Stroke) {
        this.attribute = attribute;
        this.fillColor = fillColor;
        this.stroke = stroke;
    }

    static fromDict(dict: TextSymbologyDict): TextSymbology {
        if (dict == null || dict === undefined) {
            throw Error('unable to deserialize `TextSymbology`');
        }

        return new TextSymbology(dict.attribute, ColorParam.fromDict(dict.fillColor), Stroke.fromDict(dict.stroke));
    }

    createStyler(feature: OlFeature): OlStyleText {
        const featureAttributeValue = feature.get(this.attribute);
        let featureAttributeString: string;
        if (featureAttributeValue === null || featureAttributeValue === undefined) {
            featureAttributeString = '';
        } else {
            featureAttributeString = featureAttributeValue.toString();
        }

        const textStyler = new TextStyler(
            featureAttributeString,
            this.fillColor.getColor(feature).rgbaTuple(),
            this.stroke.createStyler(feature),
        );
        return (textStyler as unknown) as OlStyleText;
    }

    equals(other: TextSymbology): boolean {
        return this.attribute === other.attribute && this.fillColor.equals(other.fillColor) && this.stroke.equals(other.stroke);
    }

    clone(): TextSymbology {
        return new TextSymbology(this.attribute, this.fillColor.clone(), this.stroke.clone());
    }

    toDict(): TextSymbologyDict {
        return {
            attribute: this.attribute,
            fillColor: this.fillColor.toDict(),
            stroke: this.stroke.toDict(),
        };
    }
}

function textSymbologyEquality(a?: TextSymbology, b?: TextSymbology): boolean {
    if (!a || !b) {
        return false;
    }

    return a.equals(b);
}
