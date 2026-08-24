use js_sys::{Array, Function, Object, Reflect};
use taffy::prelude::*;
use taffy::style::{
    GridTemplateArea, GridTemplateAreas, GridTemplateComponent, GridTemplateRepetition,
};
use wasm_bindgen::prelude::*;

type JsResult<T> = Result<T, JsValue>;

#[wasm_bindgen]
pub struct TaffyTree {
    tree: taffy::TaffyTree<JsValue>,
}

#[wasm_bindgen]
impl TaffyTree {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            tree: taffy::TaffyTree::new(),
        }
    }

    #[wasm_bindgen(js_name = disableRounding)]
    pub fn disable_rounding(&mut self) {
        self.tree.disable_rounding();
    }

    #[wasm_bindgen(js_name = newLeafWithContext)]
    pub fn new_leaf_with_context(&mut self, style: &JsValue, context: JsValue) -> JsResult<u64> {
        self.tree
            .new_leaf_with_context(parse_style(style)?, context)
            .map(u64::from)
            .map_err(to_js_error)
    }

    #[wasm_bindgen(js_name = newWithChildren)]
    pub fn new_with_children(&mut self, style: &JsValue, children: &JsValue) -> JsResult<u64> {
        let children = Array::from(children)
            .iter()
            .map(js_node_id)
            .collect::<JsResult<Vec<_>>>()?;
        self.tree
            .new_with_children(parse_style(style)?, &children)
            .map(u64::from)
            .map_err(to_js_error)
    }

    #[wasm_bindgen(js_name = setStyle)]
    pub fn set_style(&mut self, node: u64, style: &JsValue) -> JsResult<()> {
        self.tree
            .set_style(NodeId::from(node), parse_style(style)?)
            .map_err(to_js_error)
    }

    #[wasm_bindgen(js_name = computeLayoutWithMeasure)]
    pub fn compute_layout_with_measure(
        &mut self,
        root: u64,
        available_space: &JsValue,
        measure: &Function,
    ) -> JsResult<()> {
        let available_space = parse_available_size(available_space)?;
        let mut measure_error = None;
        let result = self.tree.compute_layout_with_measure(
            NodeId::from(root),
            available_space,
            |inputs, node, mut context, style| {
                taffy::compute_leaf_layout(
                    inputs,
                    style,
                    |_, _| 0.0,
                    |known, available| {
                        if measure_error.is_some() {
                            return Size::ZERO;
                        }

                        match call_measure(measure, known, available, node, context.as_deref_mut())
                        {
                            Ok(size) => size,
                            Err(error) => {
                                measure_error = Some(error);
                                Size::ZERO
                            }
                        }
                    },
                )
            },
        );

        if let Some(error) = measure_error {
            return Err(error);
        }
        result.map_err(to_js_error)
    }

    #[wasm_bindgen(js_name = getLayout)]
    pub fn get_layout(&self, node: u64) -> JsResult<JsValue> {
        let layout = self.tree.layout(NodeId::from(node)).map_err(to_js_error)?;
        let object = Object::new();
        set(&object, "x", layout.location.x)?;
        set(&object, "y", layout.location.y)?;
        set(&object, "width", layout.size.width)?;
        set(&object, "height", layout.size.height)?;
        set(
            &object,
            "contentWidth",
            layout.scrollable_overflow_rect.right,
        )?;
        set(
            &object,
            "contentHeight",
            layout.scrollable_overflow_rect.bottom,
        )?;
        Ok(object.into())
    }
}

fn call_measure(
    measure: &Function,
    known: Size<Option<f32>>,
    available: Size<AvailableSpace>,
    node: NodeId,
    context: Option<&mut JsValue>,
) -> JsResult<Size<f32>> {
    let known = size_object(
        known.width.map(JsValue::from).unwrap_or(JsValue::UNDEFINED),
        known
            .height
            .map(JsValue::from)
            .unwrap_or(JsValue::UNDEFINED),
    )?;
    let available = size_object(
        available_space_value(available.width),
        available_space_value(available.height),
    )?;
    let result = measure.call5(
        &JsValue::UNDEFINED,
        &known,
        &available,
        &JsValue::from(u64::from(node)),
        context.map_or(&JsValue::UNDEFINED, |value| &*value),
        &JsValue::UNDEFINED,
    )?;
    Ok(Size {
        width: number_property(&result, "width")?.unwrap_or(0.0),
        height: number_property(&result, "height")?.unwrap_or(0.0),
    })
}

fn parse_style(value: &JsValue) -> JsResult<Style> {
    let mut style = Style::default();
    style.display = match string_property(value, "display")?.as_deref() {
        Some("block") => Display::Block,
        Some("flow-root") => Display::FlowRoot,
        Some("grid") => Display::Grid,
        Some("none") => Display::None,
        _ => Display::Flex,
    };
    style.position = match string_property(value, "position")?.as_deref() {
        Some("absolute") => Position::Absolute,
        _ => Position::Relative,
    };
    style.box_sizing = match string_property(value, "boxSizing")?.as_deref() {
        Some("content-box") => BoxSizing::ContentBox,
        _ => BoxSizing::BorderBox,
    };
    style.flex_direction = match string_property(value, "flexDirection")?.as_deref() {
        Some("column") => FlexDirection::Column,
        Some("row-reverse") => FlexDirection::RowReverse,
        Some("column-reverse") => FlexDirection::ColumnReverse,
        _ => FlexDirection::Row,
    };
    style.flex_wrap = match string_property(value, "flexWrap")?.as_deref() {
        Some("wrap") => FlexWrap::Wrap,
        Some("wrap-reverse") => FlexWrap::WrapReverse,
        _ => FlexWrap::NoWrap,
    };
    style.align_items = align_items(string_property(value, "alignItems")?.as_deref());
    style.align_self = align_self(string_property(value, "alignSelf")?.as_deref());
    style.align_content = align_content(string_property(value, "alignContent")?.as_deref());
    style.justify_content = align_content(string_property(value, "justifyContent")?.as_deref());
    style.justify_items = align_items(string_property(value, "justifyItems")?.as_deref());
    style.justify_self = align_self(string_property(value, "justifySelf")?.as_deref());
    style.flex_grow = number_property(value, "flexGrow")?.unwrap_or(0.0);
    style.flex_shrink = number_property(value, "flexShrink")?.unwrap_or(1.0);
    style.flex_basis = dimension_property(value, "flexBasis")?.unwrap_or(Dimension::auto());
    style.aspect_ratio = number_property(value, "aspectRatio")?;
    style.grid_auto_flow = match string_property(value, "gridAutoFlow")?.as_deref() {
        Some("column") => GridAutoFlow::Column,
        Some("row-dense") => GridAutoFlow::RowDense,
        Some("column-dense") => GridAutoFlow::ColumnDense,
        _ => GridAutoFlow::Row,
    };
    style.grid_template_columns = grid_template_property(value, "gridTemplateColumns")?;
    style.grid_template_rows = grid_template_property(value, "gridTemplateRows")?;
    style.grid_auto_columns = grid_tracks_property(value, "gridAutoColumns")?;
    style.grid_auto_rows = grid_tracks_property(value, "gridAutoRows")?;
    style.grid_template_areas = grid_template_areas_property(value)?;
    style.grid_column = grid_line_property(value, "gridColumn")?;
    style.grid_row = grid_line_property(value, "gridRow")?;
    style.size = dimension_size_property(value, "size")?;
    style.min_size = length_auto_size_property(value, "minSize")?;
    style.max_size = length_auto_size_property(value, "maxSize")?;
    style.margin = margin_rect_property(value, "margin")?;
    style.padding = length_rect_property(value, "padding")?;
    style.border = length_rect_property(value, "border")?;
    style.gap = length_size_property(value, "gap")?;
    style.inset = margin_rect_property(value, "inset")?;
    Ok(style)
}

fn align_items(value: Option<&str>) -> Option<AlignItems> {
    match value {
        Some("start") => Some(AlignItems::START),
        Some("end") => Some(AlignItems::END),
        Some("flex-start") => Some(AlignItems::FLEX_START),
        Some("flex-end") => Some(AlignItems::FLEX_END),
        Some("center") => Some(AlignItems::CENTER),
        Some("stretch") => Some(AlignItems::STRETCH),
        _ => None,
    }
}

fn align_self(value: Option<&str>) -> Option<AlignSelf> {
    match value {
        Some("start") => Some(AlignSelf::START),
        Some("end") => Some(AlignSelf::END),
        Some("flex-start") => Some(AlignSelf::FLEX_START),
        Some("flex-end") => Some(AlignSelf::FLEX_END),
        Some("center") => Some(AlignSelf::CENTER),
        Some("stretch") => Some(AlignSelf::STRETCH),
        _ => None,
    }
}

fn align_content(value: Option<&str>) -> Option<AlignContent> {
    match value {
        Some("start") => Some(AlignContent::START),
        Some("end") => Some(AlignContent::END),
        Some("flex-start") => Some(AlignContent::FLEX_START),
        Some("flex-end") => Some(AlignContent::FLEX_END),
        Some("center") => Some(AlignContent::CENTER),
        Some("stretch") => Some(AlignContent::STRETCH),
        Some("space-between") => Some(AlignContent::SPACE_BETWEEN),
        Some("space-around") => Some(AlignContent::SPACE_AROUND),
        Some("space-evenly") => Some(AlignContent::SPACE_EVENLY),
        _ => None,
    }
}

fn dimension_size_property(object: &JsValue, key: &str) -> JsResult<Size<Dimension>> {
    let value = property(object, key)?;
    Ok(Size {
        width: dimension_property(&value, "width")?.unwrap_or(Dimension::auto()),
        height: dimension_property(&value, "height")?.unwrap_or(Dimension::auto()),
    })
}

fn length_size_property(object: &JsValue, key: &str) -> JsResult<Size<LengthPercentage>> {
    let value = property(object, key)?;
    Ok(Size {
        width: length_property(&value, "width")?.unwrap_or(LengthPercentage::length(0.0)),
        height: length_property(&value, "height")?.unwrap_or(LengthPercentage::length(0.0)),
    })
}

fn length_auto_size_property(object: &JsValue, key: &str) -> JsResult<Size<LengthPercentageAuto>> {
    let value = property(object, key)?;
    Ok(Size {
        width: margin_property(&value, "width")?.unwrap_or(LengthPercentageAuto::auto()),
        height: margin_property(&value, "height")?.unwrap_or(LengthPercentageAuto::auto()),
    })
}

fn margin_rect_property(object: &JsValue, key: &str) -> JsResult<Rect<LengthPercentageAuto>> {
    let value = property(object, key)?;
    Ok(Rect {
        left: margin_property(&value, "left")?.unwrap_or(LengthPercentageAuto::length(0.0)),
        right: margin_property(&value, "right")?.unwrap_or(LengthPercentageAuto::length(0.0)),
        top: margin_property(&value, "top")?.unwrap_or(LengthPercentageAuto::length(0.0)),
        bottom: margin_property(&value, "bottom")?.unwrap_or(LengthPercentageAuto::length(0.0)),
    })
}

fn length_rect_property(object: &JsValue, key: &str) -> JsResult<Rect<LengthPercentage>> {
    let value = property(object, key)?;
    Ok(Rect {
        left: length_property(&value, "left")?.unwrap_or(LengthPercentage::length(0.0)),
        right: length_property(&value, "right")?.unwrap_or(LengthPercentage::length(0.0)),
        top: length_property(&value, "top")?.unwrap_or(LengthPercentage::length(0.0)),
        bottom: length_property(&value, "bottom")?.unwrap_or(LengthPercentage::length(0.0)),
    })
}

fn grid_template_property(
    object: &JsValue,
    key: &str,
) -> JsResult<Vec<GridTemplateComponent<String>>> {
    Array::from(&property(object, key)?)
        .iter()
        .map(|value| {
            let repeat = number_property(&value, "count")?;
            if let Some(count) = repeat {
                let tracks = grid_tracks(&property(&value, "tracks")?)?;
                return Ok(GridTemplateComponent::Repeat(GridTemplateRepetition {
                    count: RepetitionCount::Count(count as u16),
                    line_names: vec![Vec::new(); tracks.len() + 1],
                    tracks,
                }));
            }
            Ok(GridTemplateComponent::Single(grid_track(&value)?))
        })
        .collect()
}

fn grid_tracks_property(object: &JsValue, key: &str) -> JsResult<Vec<TrackSizingFunction>> {
    grid_tracks(&property(object, key)?)
}

fn grid_tracks(value: &JsValue) -> JsResult<Vec<TrackSizingFunction>> {
    Array::from(value)
        .iter()
        .map(|value| grid_track(&value))
        .collect()
}

fn grid_track(value: &JsValue) -> JsResult<TrackSizingFunction> {
    if value.is_object() && !value.is_null() {
        return Ok(TrackSizingFunction {
            min: min_track(&property(value, "min")?)?,
            max: max_track(&property(value, "max")?)?,
        });
    }
    let max = max_track(value)?;
    Ok(TrackSizingFunction {
        min: max.into(),
        max,
    })
}

fn min_track(value: &JsValue) -> JsResult<MinTrackSizingFunction> {
    if let Some(number) = value.as_f64() {
        return Ok(MinTrackSizingFunction::length(number as f32));
    }
    match value.as_string().as_deref() {
        Some("auto") => Ok(MinTrackSizingFunction::auto()),
        Some("min-content") => Ok(MinTrackSizingFunction::min_content()),
        Some("max-content") => Ok(MinTrackSizingFunction::max_content()),
        Some(value) if value.ends_with('%') => {
            Ok(MinTrackSizingFunction::percent(percent_number(value)?))
        }
        _ => Err(JsValue::from_str("Invalid minimum grid track")),
    }
}

fn max_track(value: &JsValue) -> JsResult<MaxTrackSizingFunction> {
    if let Some(number) = value.as_f64() {
        return Ok(MaxTrackSizingFunction::length(number as f32));
    }
    match value.as_string().as_deref() {
        Some("auto") => Ok(MaxTrackSizingFunction::auto()),
        Some("min-content") => Ok(MaxTrackSizingFunction::min_content()),
        Some("max-content") => Ok(MaxTrackSizingFunction::max_content()),
        Some(value) if value.ends_with('%') => {
            Ok(MaxTrackSizingFunction::percent(percent_number(value)?))
        }
        Some(value) if value.ends_with("fr") => {
            Ok(MaxTrackSizingFunction::fr(suffix_number(value, "fr")?))
        }
        _ => Err(JsValue::from_str("Invalid maximum grid track")),
    }
}

fn grid_line_property(object: &JsValue, key: &str) -> JsResult<Line<GridPlacement<String>>> {
    let value = property(object, key)?;
    Ok(Line {
        start: grid_placement(&property(&value, "start")?)?,
        end: grid_placement(&property(&value, "end")?)?,
    })
}

fn grid_placement(value: &JsValue) -> JsResult<GridPlacement<String>> {
    if let Some(number) = value.as_f64() {
        return Ok(GridPlacement::from_line_index(number as i16));
    }
    if value.as_string().as_deref() == Some("auto") {
        return Ok(GridPlacement::Auto);
    }
    if value.is_object() && !value.is_null() {
        if let Some(span) = number_property(value, "span")? {
            return Ok(GridPlacement::from_span(span as u16));
        }
        if let Some(area) = string_property(value, "area")? {
            return Ok(GridPlacement::NamedLine(area, 0));
        }
    }
    Err(JsValue::from_str("Invalid grid placement"))
}

fn grid_template_areas_property(object: &JsValue) -> JsResult<Option<GridTemplateAreas<String>>> {
    let value = property(object, "gridTemplateAreas")?;
    if value.is_undefined() || value.is_null() {
        return Ok(None);
    }

    let areas = Array::from(&property(&value, "areas")?)
        .iter()
        .map(|area| {
            Ok(GridTemplateArea {
                name: required_string_property(&area, "name")?,
                row_start: required_u16_property(&area, "rowStart")?,
                row_end: required_u16_property(&area, "rowEnd")?,
                column_start: required_u16_property(&area, "columnStart")?,
                column_end: required_u16_property(&area, "columnEnd")?,
            })
        })
        .collect::<JsResult<Vec<_>>>()?;

    Ok(Some(GridTemplateAreas {
        areas,
        row_count: required_u16_property(&value, "rowCount")?,
        column_count: required_u16_property(&value, "columnCount")?,
    }))
}

fn parse_available_size(value: &JsValue) -> JsResult<Size<AvailableSpace>> {
    Ok(Size {
        width: available_space(&property(value, "width")?)?,
        height: available_space(&property(value, "height")?)?,
    })
}

fn available_space(value: &JsValue) -> JsResult<AvailableSpace> {
    if let Some(number) = value.as_f64() {
        return Ok(AvailableSpace::Definite(number as f32));
    }
    match value.as_string().as_deref() {
        Some("min-content") => Ok(AvailableSpace::MinContent),
        Some("max-content") => Ok(AvailableSpace::MaxContent),
        _ => Err(JsValue::from_str("Invalid available space")),
    }
}

fn available_space_value(value: AvailableSpace) -> JsValue {
    match value {
        AvailableSpace::Definite(value) => JsValue::from(value),
        AvailableSpace::MinContent => JsValue::from_str("min-content"),
        AvailableSpace::MaxContent => JsValue::from_str("max-content"),
    }
}

fn dimension_property(object: &JsValue, key: &str) -> JsResult<Option<Dimension>> {
    let value = property(object, key)?;
    if value.is_undefined() || value.is_null() {
        return Ok(None);
    }
    if let Some(number) = value.as_f64() {
        return Ok(Some(Dimension::length(number as f32)));
    }
    match value.as_string().as_deref() {
        Some("auto") => Ok(Some(Dimension::auto())),
        Some(value) if value.ends_with('%') => Ok(Some(Dimension::percent(percent_number(value)?))),
        _ => Err(JsValue::from_str(&format!("Invalid dimension for {key}"))),
    }
}

fn length_property(object: &JsValue, key: &str) -> JsResult<Option<LengthPercentage>> {
    let value = property(object, key)?;
    if value.is_undefined() || value.is_null() {
        return Ok(None);
    }
    if let Some(number) = value.as_f64() {
        return Ok(Some(LengthPercentage::length(number as f32)));
    }
    match value.as_string().as_deref() {
        Some(value) if value.ends_with('%') => {
            Ok(Some(LengthPercentage::percent(percent_number(value)?)))
        }
        _ => Err(JsValue::from_str(&format!("Invalid length for {key}"))),
    }
}

fn margin_property(object: &JsValue, key: &str) -> JsResult<Option<LengthPercentageAuto>> {
    let value = property(object, key)?;
    if value.as_string().as_deref() == Some("auto") {
        return Ok(Some(LengthPercentageAuto::auto()));
    }
    Ok(length_property(object, key)?.map(|value| value.into()))
}

fn percent_number(value: &str) -> JsResult<f32> {
    Ok(suffix_number(value, "%")? / 100.0)
}

fn suffix_number(value: &str, suffix: &str) -> JsResult<f32> {
    value
        .strip_suffix(suffix)
        .and_then(|value| value.parse::<f32>().ok())
        .ok_or_else(|| JsValue::from_str(&format!("Invalid numeric value: {value}")))
}

fn js_node_id(value: JsValue) -> JsResult<NodeId> {
    let id = js_sys::BigInt::from(value)
        .to_string(10)
        .ok()
        .and_then(|value| value.as_string())
        .and_then(|value| value.parse::<u64>().ok())
        .ok_or_else(|| JsValue::from_str("Invalid Taffy node ID"))?;
    Ok(NodeId::from(id))
}

fn property(object: &JsValue, key: &str) -> JsResult<JsValue> {
    Reflect::get(object, &JsValue::from_str(key))
}

fn string_property(object: &JsValue, key: &str) -> JsResult<Option<String>> {
    Ok(property(object, key)?.as_string())
}

fn number_property(object: &JsValue, key: &str) -> JsResult<Option<f32>> {
    Ok(property(object, key)?.as_f64().map(|value| value as f32))
}

fn required_string_property(object: &JsValue, key: &str) -> JsResult<String> {
    string_property(object, key)?
        .ok_or_else(|| JsValue::from_str(&format!("Missing string property: {key}")))
}

fn required_u16_property(object: &JsValue, key: &str) -> JsResult<u16> {
    number_property(object, key)?
        .map(|value| value as u16)
        .ok_or_else(|| JsValue::from_str(&format!("Missing numeric property: {key}")))
}

fn size_object(width: JsValue, height: JsValue) -> JsResult<JsValue> {
    let object = Object::new();
    Reflect::set(&object, &JsValue::from_str("width"), &width)?;
    Reflect::set(&object, &JsValue::from_str("height"), &height)?;
    Ok(object.into())
}

fn set(object: &Object, key: &str, value: f32) -> JsResult<()> {
    Reflect::set(object, &JsValue::from_str(key), &JsValue::from(value)).map(|_| ())
}

fn to_js_error(error: impl core::fmt::Display) -> JsValue {
    JsValue::from_str(&error.to_string())
}
