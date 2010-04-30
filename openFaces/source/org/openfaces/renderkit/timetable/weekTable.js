/*
 * OpenFaces - JSF Component Library 2.0
 * Copyright (C) 2007-2010, TeamDev Ltd.
 * licensing@openfaces.org
 * Unless agreed in writing the contents of this file are subject to
 * the GNU Lesser General Public License Version 2.1 (the "LGPL" License).
 * This library is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * Please visit http://openfaces.org/licensing/ for more details.
 */

// ================================== PUBLIC API FUNCTIONS

//  weekTable.updateLayout();

// ========== implementation

O$.WeekTable = {};

O$.WeekTable.EVENT_ROLLOVER_STATE_UPDATE_TIMEOUT = 1;

O$.WeekTable.DEFAULT_EVENT_CONTENT = [ { type : "name"}, { type : "description" } ];

O$.WeekTable._init = function(componentId,
                            day, locale, dateFormat, startTimeStr, endTimeStr, scrollTimeStr,
                            preloadedEventParams, resources, eventAreaSettings,
                            editable, onchange, editingOptions,
                            stylingParams,
                            uiEvent,
                            timePattern,
                            timeSuffixPattern,
                            majorTimeInterval,
                            minorTimeInterval,
                            showTimeForMinorIntervals,
                            calendarOptions
        ) {
  var weekTable = O$(componentId);
  if (O$.isExplorer()) {
    if (!weekTable._initScheduled) {
      weekTable._initScheduled = true;
      var initArgs = arguments;
      // postpone initialization to avoid IE failure during page loading
      O$.addInternalLoadEvent(function() {
        O$.WeekTable._init.apply(null, initArgs);
      });
      return;
    }
  }

  O$.initComponent(componentId, {rollover: stylingParams.rolloverClass});

  var eventProvider = new O$.WeekTable._LazyLoadedTimetableEvents(
          preloadedEventParams.events,
          preloadedEventParams.from,
          preloadedEventParams.to);
  eventProvider._weekTable = weekTable;
  var dateTimeFormat = O$.getDateTimeFormatObject(locale);

  if (!editingOptions)
    editingOptions = {};
  if (editingOptions.eventResourceEditable === undefined) editingOptions.eventResourceEditable = true;
  if (editingOptions.eventDurationEditable === undefined) editingOptions.eventDurationEditable = true;
  if (editingOptions.defaultEventDuration === undefined || editingOptions.defaultEventDuration <= 0) editingOptions.defaultEventDuration = 30;
  if (editingOptions.autoSaveChanges === undefined) editingOptions.autoSaveChanges = true;
  if (editingOptions.overlappedEventsAllowed === undefined) editingOptions.overlappedEventsAllowed = true;

  var reservedTimeEventColor = stylingParams.reservedTimeEventColor ? stylingParams.reservedTimeEventColor : "#b0b0b0";
  var reservedTimeEventClass = O$.combineClassNames(["o_reservedTimeEvent", stylingParams.reservedTimeEventClass]);

  var shortestEventTimeWhileResizing = 1000 * 60 * minorTimeInterval;

  var firstDayOfWeek = (calendarOptions && calendarOptions.firstDayOfWeek) ? calendarOptions.firstDayOfWeek : 0; 

  if (!uiEvent)
    uiEvent = {};
  if (!startTimeStr)
    startTimeStr = "00:00";
  if (!endTimeStr || endTimeStr == "00:00")
    endTimeStr = "24:00";
  var startTime = O$.parseTime(startTimeStr);
  var endTime = O$.parseTime(endTimeStr);
  if (!scrollTimeStr)
    scrollTimeStr = startTimeStr;
  var scrollTime = O$.parseTime(scrollTimeStr);
  var startTimeInMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  var endTimeInMinutes = (endTime.getHours() == 0 ? 24 : endTime.getHours()) * 60 + endTime.getMinutes();

  var eventResizeHandleHeight = O$.calculateNumericCSSValue("6px");

  var showTimeAgainstMark = stylingParams.timeTextPosition && stylingParams.timeTextPosition == "againstMark";

  var resourceHeadersRowClass = O$.combineClassNames(["o_resourceHeadersRow", stylingParams.resourceHeadersRowClass]);
  var weekdayHeadersRowClass = O$.combineClassNames(["o_weekdayHeadersRow", stylingParams.weekdayHeadersRowClass]);
  var timetableViewRowClass = O$.combineClassNames(["o_timetableViewRowClass", stylingParams.rowClass]);

  var timeColumnClass = O$.combineClassNames(["o_timeColumn", stylingParams.timeColumnClass]);
  var majorTimeStyle = O$.combineClassNames(["o_majorTimeText", stylingParams.majorTimeClass]);
  var minorTimeStyle = O$.combineClassNames(["o_minorTimeText", stylingParams.minorTimeClass]);
  var timeSuffixStyle = O$.combineClassNames(["o_timeSuffixText", stylingParams.timeSuffixClass]);
  var weekdayStyle = O$.combineClassNames(["o_weekdayText", stylingParams.weekdayClass]);

  var eventStyleClass = O$.combineClassNames(["o_timetableEvent", uiEvent.style]);
  var rolloverEventClass = O$.combineClassNames(["o_rolloverTimetableEvent", uiEvent.rolloverStyle]);

  var eventNameClass = O$.combineClassNames(["o_timetableEventName", uiEvent.nameStyle]);
  var eventDescriptionClass = O$.combineClassNames(["o_timetableEventDescription", uiEvent.descriptionStyle]);
  var eventResourceClass = O$.combineClassNames(["o_timetableEventResource", uiEvent.resourceStyle]);
  var eventTimeClass = O$.combineClassNames(["o_timetableEventTime", uiEvent.timeStyle]);
  var eventContentClasses = {
    name : eventNameClass,
    description : eventDescriptionClass,
    resource : eventResourceClass,
    time: eventTimeClass
  };

  var eventBackgroundStyleClassName = "o_timetableEventBackground";
  var defaultEventColor = stylingParams.defaultEventColor ? stylingParams.defaultEventColor : "#006ebb";
  var escapeEventNames = uiEvent.escapeName !== undefined ? uiEvent.escapeName : true;
  weekTable._escapeEventNames = escapeEventNames;
  var escapeEventDescriptions = uiEvent.escapeDescription !== undefined ? uiEvent.escapeDescription : true;
  weekTable._escapeEventDescriptions = escapeEventDescriptions;
  var escapeEventResources = uiEvent.escapeResource !== undefined ? uiEvent.escapeResource : true;
  weekTable._escapeEventResources = escapeEventResources;
  var eventContent = uiEvent.content ? uiEvent.content : O$.WeekTable.DEFAULT_EVENT_CONTENT;

  var eventBackgroundIntensity = uiEvent.backgroundIntensity !== undefined ? uiEvent.backgroundIntensity : 0.25;
  var eventBackgroundTransparency = uiEvent.backgroundTransparency !== undefined ? uiEvent.backgroundTransparency : 0.2;
  var dragAndDropTransitionPeriod = stylingParams.dragAndDropTransitionPeriod !== undefined ? stylingParams.dragAndDropTransitionPeriod : 70;
  var dragAndDropCancelingPeriod = stylingParams.dragAndDropCancelingPeriod !== undefined ? stylingParams.dragAndDropCancelingPeriod : 200;
  var undroppableStateTransitionPeriod = stylingParams.undroppableStateTransitionPeriod !== undefined ? stylingParams.undroppableStateTransitionPeriod : 250;
  var undroppableEventTransparency = stylingParams.undroppableEventTransparency !== undefined ? stylingParams.undroppableEventTransparency : 0.5;

  var resourceHeadersRowSeparator = stylingParams.resourceHeadersRowSeparator ? stylingParams.resourceHeadersRowSeparator : "1px solid gray";
  var weekdayHeadersRowSeparator = stylingParams.weekdayHeadersRowSeparator ? stylingParams.weekdayHeadersRowSeparator : "1px solid gray";
  var resourceColumnSeparator = stylingParams.resourceColumnSeparator ? stylingParams.resourceColumnSeparator : "1px dotted silver";
  var weekdayColumnSeparator = stylingParams.weekdayColumnSeparator ? stylingParams.weekdayColumnSeparator : "1px solid silver";
  var timeColumnSeparator = stylingParams.timeColumnSeparator ? stylingParams.timeColumnSeparator : "2px solid gray";
  var primaryRowSeparator = stylingParams.primaryRowSeparator ? stylingParams.primaryRowSeparator : "1px solid #b0b0b0";
  var secondaryRowSeparator = stylingParams.secondaryRowSeparator ? stylingParams.secondaryRowSeparator : "1px solid #e4e4e4";
  var timeColumnPrimaryRowSeparator = stylingParams.timeColumnPrimaryRowSeparator ? stylingParams.timeColumnPrimaryRowSeparator : "1px solid #b0b0b0";
  var timeColumnSecondaryRowSeparator = stylingParams.timeColumnSecondaryRowSeparator ? stylingParams.timeColumnSecondaryRowSeparator : "1px solid #e4e4e4";

  var weekdayPattern = stylingParams.weekdayPattern ? stylingParams.weekdayPattern : "EEE MMM d";

  var eventsLeftOffset = O$.calculateNumericCSSValue(O$.getStyleClassProperty(eventStyleClass, "marginLeft"));
  var eventsRightOffset = O$.calculateNumericCSSValue(O$.getStyleClassProperty(eventStyleClass, "marginRight"));
  var reservedEventsLeftOffset = O$.calculateNumericCSSValue(O$.getStyleClassProperty(reservedTimeEventClass, "marginLeft"));
  var reservedEventsRightOffset = O$.calculateNumericCSSValue(O$.getStyleClassProperty(reservedTimeEventClass, "marginRight"));
  var table = O$(componentId + "::table");
  var resourceHeadersTable = O$(componentId + "::resourceHeaders");
  var weekdayHeadersTable = O$(componentId + "::weekdayHeaders");
  weekTable._scroller = O$(weekTable.id + "::scroller");

  var hiddenArea = O$(componentId + "::hiddenArea");
  weekTable._hiddenArea = hiddenArea;
  var useResourceSeparation = resources.length > 0;
  var columnsInWeekday = useResourceSeparation ? resources.length : 1;
  var columns = [
    {
      className: timeColumnClass
    }
  ];
  var headerColumns = [
    {
      className: timeColumnClass
    }
  ];
  var weekdayHeaderColumns = [
    {
      className: timeColumnClass
    }
  ];
  if (useResourceSeparation) {
    weekTable._resourcesByIds = {};
    weekTable._idsByResourceNames = {};
    for (var resourceIndex = 0; resourceIndex < resources.length; resourceIndex++) {
      var resource = resources[resourceIndex];
      weekTable._resourcesByIds[resource.id] = resource;
      weekTable._idsByResourceNames[resource.name] = resource.id;
      resource._colIndex = resourceIndex + 1;
      for (var weekDay = 0; weekDay < 7; weekDay++) {
        columns.push({});
        headerColumns.push({});
      }
    }
    headerColumns.push({className: "o_defaultScrollBarWidth"});
  } else {
    for (var weekDay = 0; weekDay < 7; weekDay++) {
      columns.push({});
    }
  }

  for (var weekDay = 0; weekDay < 7; weekDay++) {
    weekdayHeaderColumns.push({});
  }
  weekdayHeaderColumns.push({className: "o_defaultScrollBarWidth"});

  weekTable._getResourceForEvent = function(event) {
    if (!event.resourceId || !useResourceSeparation)
      return null;
    var resource = weekTable._resourcesByIds[event.resourceId];
    return resource;
  };

  var rowHeight = O$.getStyleClassProperty(timetableViewRowClass, "height");
  var duplicatedRows = showTimeAgainstMark;
  if (duplicatedRows && rowHeight) {
    var heightPx = O$.calculateNumericCSSValue(rowHeight);
    var additionalRowHeightClass = O$.createCssClass("height: " + Math.ceil(heightPx / 2) + "px ! important");
    timetableViewRowClass = O$.combineClassNames([timetableViewRowClass, additionalRowHeightClass]);
  }

  var forceUsingCellStyles = true; // allow such styles as text-align to be applied to row's cells

  O$.Tables._init(table, {
    columns: columns,
    gridLines: [primaryRowSeparator, resourceColumnSeparator, null, null, null, null, null, null, null, null, null],
    body: {rowClassName: timetableViewRowClass},
    forceUsingCellStyles: forceUsingCellStyles
  });


  O$.Tables._init(weekdayHeadersTable, {
    columns: weekdayHeaderColumns,
    gridLines: [primaryRowSeparator, weekdayColumnSeparator, null, null, null, null, null, null, null, null, null],
    body: {rowClassName: weekdayHeadersRowClass},
    forceUsingCellStyles: forceUsingCellStyles
  });
  weekdayHeadersTable.style.borderBottom = weekdayHeadersRowSeparator;


  if (useResourceSeparation) {
    O$.Tables._init(resourceHeadersTable, {
      columns: headerColumns,
      gridLines: [primaryRowSeparator, resourceColumnSeparator, null, null, null, null, null, null, null, null, null],
      body: {rowClassName: resourceHeadersRowClass},
      forceUsingCellStyles: forceUsingCellStyles
    });
    resourceHeadersTable.style.borderBottom = resourceHeadersRowSeparator;
  }

  if (minorTimeInterval >= majorTimeInterval) {
    // Minor time interval should be less than a major one. Swap them as a fallback.
    var maxInterval = minorTimeInterval;
    minorTimeInterval = majorTimeInterval;
    majorTimeInterval = maxInterval;
  }

  var minorPerMajorIntervals = Math.round(majorTimeInterval / minorTimeInterval);
  if (Math.abs(majorTimeInterval / minorTimeInterval - minorPerMajorIntervals) > 0) {
    // Major time interval is not a multiple of a minor one. Make it a nearest divisible of the major one as a fallback.
    minorTimeInterval = majorTimeInterval / minorPerMajorIntervals;
  }

  var intervalCount = (endTimeInMinutes - startTimeInMinutes) / minorTimeInterval;
  var roundedIntervalCount = Math.round(intervalCount);
  if (Math.abs(intervalCount - roundedIntervalCount) > 0) {
    // The entire time span from start time to end time should be divisible by a minor time interval.
    // The fallback here is to move end time to the nearest minor interval boundary before the specified end time.
    endTimeInMinutes = roundedIntervalCount * minorTimeInterval;
  }
  intervalCount = roundedIntervalCount;

  var now = new Date();
  var minutesPerRow = showTimeAgainstMark ? minorTimeInterval / 2 : minorTimeInterval;
  for (var timeInMinutes = startTimeInMinutes, intervalIndex = 0;
       timeInMinutes < endTimeInMinutes;
       timeInMinutes += minorTimeInterval,intervalIndex++) {
    var isMajorMark = (!showTimeAgainstMark ? intervalIndex : intervalIndex + 1) % minorPerMajorIntervals == 0;
    var row = table.body._createRow();
    var row2 = showTimeAgainstMark ? table.body._createRow() : null;
    if (row2) row2._row = row;
    row._intervalStartMinutes = timeInMinutes;
    if (row2) row2._intervalStartMinutes = timeInMinutes + minorTimeInterval / 2;
    row._updateTime = function(day) {
      this._time = O$.cloneDate(day);
      this._time.setHours(Math.floor(this._intervalStartMinutes / 60), this._intervalStartMinutes % 60, 0, 0);
    };
    if (row2) row2._updateTime = row._updateTime;
    row._updateTime(now);


    var timeHeader = showTimeAgainstMark ? row2.firstChild : row.firstChild;
    var headerCellSpan = 1;
    if (showTimeAgainstMark && intervalIndex != intervalCount - 1)
      headerCellSpan = 2;
    if (headerCellSpan != 1)
      timeHeader.rowSpan = headerCellSpan;
    if (intervalIndex == 0 && showTimeAgainstMark) {
      var emptyTimeHeader = row.firstChild;
      O$.appendClassNames(emptyTimeHeader, ["o_tinyText"]);
    }
    if (showTimeAgainstMark && intervalIndex == intervalCount - 1) {
      O$.appendClassNames(timeHeader, ["o_tinyText"]);
    }

    timeHeader._aHeaderCell = true;
    if (isMajorMark || showTimeForMinorIntervals) {
      if (showTimeAgainstMark)
        timeHeader.style.verticalAlign = "middle";
      var excludeTrailingMarkInscription = showTimeAgainstMark && headerCellSpan != 2;
      var markTime = row._time;
      if (showTimeAgainstMark) {
        markTime = O$.cloneDateTime(markTime);
        markTime.setMinutes(markTime.getMinutes() + minorTimeInterval);
      }

      if (!excludeTrailingMarkInscription) {
        var timeText = dateTimeFormat.format(markTime, timePattern);
        var timeSuffixText = dateTimeFormat.format(markTime, timeSuffixPattern);

        var timeStyle = isMajorMark ? majorTimeStyle : minorTimeStyle;
        var combinedTimeSuffixStyle = O$.combineClassNames([timeStyle, timeSuffixStyle]);
        timeHeader.appendChild(O$.createStyledText(timeText, timeStyle));
        timeHeader.appendChild(O$.createStyledText(timeSuffixText, combinedTimeSuffixStyle));
      }
    }

    var newRows = [row];
    if (row2)
      newRows.push(row2);
    table.body._addRows(newRows);

    var cells = row._cells;
    var cells2 = row2 ? row2._cells : null;
    for (var cellIndex = 1, cellCount = cells.length; cellIndex < cellCount; cellIndex++) {
      var cell = cells[cellIndex];
      var cell2 = cells2 ? cells2[cellIndex] : null;
      if (useResourceSeparation) {
        cell._resource = resources[(cellIndex - 1) % resources.length];
      }
      cell._weekday = Math.floor((cellIndex - 1) / columnsInWeekday);
      cell.onclick = function() {
        // onclick event can be fired on drag end under IE
        if (weekTable._draggingInProgress)
          return;
        if (editable)
          var newEventTime = new Date(this._row._time.getTime() + 86400000 * this._weekday);
          weekTable._addEvent(newEventTime, this._resource ? this._resource.id : null);
      };

      if (cell2) {
        cell2._cell = cell;
        cell2.onclick = function() {
          this._cell.onclick();
        };
      }
    }

    if (showTimeAgainstMark && intervalIndex > 0)
      row.removeChild(row.firstChild);
  }

  table.body._getBorderBottomForCell = function(rowIndex, colIndex, cell) {
    var correctedRowIndex = rowIndex + cell.rowSpan - 1;
    if (duplicatedRows && correctedRowIndex % 2 == 0)
      return "none";
    if (duplicatedRows)
      correctedRowIndex = (correctedRowIndex - 1) / 2;
    if (colIndex == 0) {
      return (correctedRowIndex % minorPerMajorIntervals) == minorPerMajorIntervals - 1 ? timeColumnPrimaryRowSeparator : timeColumnSecondaryRowSeparator;
    } else {
      return (correctedRowIndex % minorPerMajorIntervals) == minorPerMajorIntervals - 1 ? primaryRowSeparator : secondaryRowSeparator;
    }
  };

  table.body._overrideVerticalGridline(0, timeColumnSeparator);
  weekdayHeadersTable.body._overrideVerticalGridline(0, timeColumnSeparator);
  weekdayHeadersTable.body._overrideVerticalGridline(weekdayHeaderColumns.length - 2, O$.isExplorer6() ? "1px solid white" : "1px solid transparent");

  for (var weekdayColumn = columnsInWeekday; weekdayColumn < columns.length; weekdayColumn += columnsInWeekday) {
    table.body._overrideVerticalGridline(weekdayColumn, weekdayColumnSeparator);
    if (useResourceSeparation) {
      resourceHeadersTable.body._overrideVerticalGridline(weekdayColumn, weekdayColumnSeparator);
    }
  }

  if (useResourceSeparation) {
    resourceHeadersTable.body._overrideVerticalGridline(0, timeColumnSeparator);
    resourceHeadersTable.body._overrideVerticalGridline(headerColumns.length - 2, O$.isExplorer6() ? "1px solid white" : "1px solid transparent");
  }

  weekTable._getLayoutCache = function() {
    if (!weekTable._cachedPositions)
      weekTable._cachedPositions = {};
    return weekTable._cachedPositions;
  };
  weekTable._getScrollingCache = function() {
    if (!weekTable._cachedScrollPositions)
      weekTable._cachedScrollPositions = {};
    return weekTable._cachedScrollPositions;
  };
  weekTable._resetScrollingCache = function() {
    weekTable._cachedScrollPositions = {};
  };

  function adjustRolloverPaddings() {
    var tempDiv = document.createElement("div");

    tempDiv.style.visibility = "hidden";
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "0px";
    tempDiv.style.top = "0px";
    document.body.appendChild(tempDiv);

    setTimeout(function() {
      tempDiv.className = eventStyleClass;
      var eventStyleProperties = O$.getElementStyle(tempDiv, ["padding-left", "padding-right", "padding-top", "padding-bottom",
        "border-left-width", "border-top-width", "border-right-width", "border-bottom-width"]);
      tempDiv.className = rolloverEventClass;
      var rolloverEventStyleProperties = O$.getElementStyle(tempDiv, ["padding-left", "padding-right", "padding-top", "padding-bottom",
        "border-left-width", "border-top-width", "border-right-width", "border-bottom-width"]);
      document.body.removeChild(tempDiv);

      var userRolloverPaddings = O$.getStyleClassProperties(
              uiEvent.rolloverStyle, ["padding-left", "padding-right", "padding-top", "padding-bottom"]);

      var adjustedStyles = "";

      function adjustPaddingIfNotSpecified(paddingPropertyName, padding, border, rolloverPadding, rolloverBorder) {
        if (userRolloverPaddings[paddingPropertyName])
          return;
        rolloverPadding = O$.calculateNumericCSSValue(padding) + O$.calculateNumericCSSValue(border) - O$.calculateNumericCSSValue(rolloverBorder);
        adjustedStyles += paddingPropertyName + ": " + rolloverPadding + "px; ";
      }

      adjustPaddingIfNotSpecified("padding-left", eventStyleProperties.paddingLeft, eventStyleProperties.borderLeftWidth,
              rolloverEventStyleProperties.paddingLeft, rolloverEventStyleProperties.borderLeftWidth);
      adjustPaddingIfNotSpecified("padding-right", eventStyleProperties.paddingRight, eventStyleProperties.borderRightWidth,
              rolloverEventStyleProperties.paddingRight, rolloverEventStyleProperties.borderRightWidth);
      adjustPaddingIfNotSpecified("padding-top", eventStyleProperties.paddingTop, eventStyleProperties.borderTopWidth,
              rolloverEventStyleProperties.paddingTop, rolloverEventStyleProperties.borderTopWidth);
      adjustPaddingIfNotSpecified("padding-bottom", eventStyleProperties.paddingBottom, eventStyleProperties.borderBottomWidth,
              rolloverEventStyleProperties.paddingBottom, rolloverEventStyleProperties.borderBottomWidth);

      if (adjustedStyles) {
        var newClassName = O$.createCssClass(adjustedStyles);
        rolloverEventClass = O$.combineClassNames([rolloverEventClass, newClassName]);
      }
    }, 1);
  }

  adjustRolloverPaddings();

  var ieEventHandlerLayer = O$.isExplorer() ? O$.createAbsolutePositionedElement(weekTable._scroller) : null;
  var absoluteElementsParentNode = O$.createAbsolutePositionedElement(weekTable._scroller);
  weekTable._absoluteElementsParentNode = absoluteElementsParentNode;
  absoluteElementsParentNode.style.overflow = "hidden";
  absoluteElementsParentNode._updatePos = function() {
    var tableRect = O$.getElementBorderRectangle(table, true);
    var rect = new O$.Rectangle(0, 0, tableRect.width, tableRect.height);
    O$.setElementBorderRectangle(absoluteElementsParentNode, rect);
    if (ieEventHandlerLayer)
      O$.setElementBorderRectangle(ieEventHandlerLayer, rect);
  };
  absoluteElementsParentNode.onclick = function(e) {
    var clickPoint = O$.getEventPoint(e);
    var cell = table._cellFromPoint(clickPoint.x, clickPoint.y, false);
    if (cell && cell.onclick)
      cell.onclick(e);
  };
  if (ieEventHandlerLayer) {
    O$.fixIEEventsForTransparentLayer(ieEventHandlerLayer);
    ieEventHandlerLayer.onclick = function(e) {
      absoluteElementsParentNode.onclick(e);
    };
  }

  weekTable._getEventEditor = function() {
    if (!editable)
      return null;
    return weekTable._eventEditor;
  };


  function getNearestTimeslotForPosition(x, y, weekday) {
    var row = table.body._rowFromPoint(10, y, true, weekTable._getLayoutCache());

    if (!row) {
      var time;

      if (y <= 0) {
        time = weekTable._startTime;
        if (weekday && weekday > 0) {
          time = new Date(time.getTime() + weekday * 86400000);
        }
      } else {
        time = weekTable._endTime; //TODO
      }

      return {
        resource: undefined,
        time: time
      };
    }

    var cell = row._cellFromPoint(x, y, true, weekTable._getLayoutCache());
    var resource;
    if (cell) {
      if (cell._cell) {
        cell = cell._cell;
        row = cell._row;
      }
      var nextCell = cell.nextSibling;
      if (!nextCell)
        resource = cell._resource;
      else {
        if (!cell._resource && nextCell._resource)
          resource = nextCell._resource;
        else {
          var x1 = O$.getElementPos(cell, true, weekTable._getLayoutCache()).x;
          var x2 = O$.getElementPos(nextCell, true, weekTable._getLayoutCache()).x;
          var nearestCell = Math.abs(x - x1) < Math.abs(x - x2) ? cell : nextCell;
          resource = nearestCell._resource;
        }
      }
    }

    if (row._row)
      row = row._row;
    var time;
    var rows = table.body._getRows();
    var rowIncrement = duplicatedRows ? 2 : 1;
    var nextRow = (row._index + rowIncrement < rows.length) ? rows[row._index + rowIncrement] : null;
    var timeAtPosition = new Date();
    if (!nextRow) {
      time = row._time;
      var rowRect = O$.getElementBorderRectangle(row, true, weekTable._getLayoutCache());
      timeAtPosition.setTime(row._time.getTime() + minutesPerRow * 60000 * (y - rowRect.y) / rowRect.height);
    } else {
      var y1 = O$.getElementPos(row, true, weekTable._getLayoutCache()).y;
      var y2 = O$.getElementPos(nextRow, true, weekTable._getLayoutCache()).y;
      var nearestRow = Math.abs(y - y1) < Math.abs(y - y2) ? row : nextRow;
      time = nearestRow._time;
      timeAtPosition.setTime(row._time.getTime() + minutesPerRow * 60000 * (y - y1) / (y2 - y1));
    }

    if (weekday && weekday > 0) {
      time = new Date(time.getTime() + weekday * 86400000);
      timeAtPosition = new Date(timeAtPosition.getTime() + weekday * 86400000);
    }

    return {resource: resource, time: time, timeAtPosition: timeAtPosition};
  }

  function getVertOffsetByTime(time, isEnd, isNextDay) {
    var hours = time.getHours();
    var minutes = time.getMinutes();

    if (!isEnd) {
      var startTime = weekTable._startTime;
      var startHours = startTime.getHours();
      var startMinutes = startTime.getMinutes();
      if (hours < startHours || (hours == startHours && minutes < startMinutes)) {
        hours -= 24;
      }
    } else {
      var endTime = weekTable._endTime;
      var endHours = endTime.getHours();
      var endMinutes = endTime.getMinutes();
      if (isNextDay) {
        hours += 24;
      } else {
        if (endHours == 0 && endMinutes == 0) {
          endHours = 24;
        }
        if (hours > endHours || (hours == endHours && minutes > endMinutes)) {
          hours += 24;
        }
      }
    }

    var timeOffsetInMinutes = hours * 60 + minutes - startTimeInMinutes;
    var minutesPerRow = duplicatedRows ? minorTimeInterval / 2 : minorTimeInterval;
    var rowIndex = Math.floor(timeOffsetInMinutes / minutesPerRow);
    var relativePosInsideRow = (timeOffsetInMinutes % minutesPerRow) / minutesPerRow;
    var rows = table.body._getRows();
    var correctedRowIndex = rowIndex;
    if (correctedRowIndex < 0)
      correctedRowIndex = 0;
    if (correctedRowIndex >= rows.length)
      correctedRowIndex = rows.length - 1;
    var row = rows[correctedRowIndex];
    var rowRectangle = O$.getElementBorderRectangle(row, true);
    var result = {y: rowRectangle.y + rowRectangle.height * relativePosInsideRow};
    if (rowIndex < 0) {
      result.y += rowRectangle.height * rowIndex;
      result.topTruncated = true;
    }
    if (rowIndex >= rows.length) {
      result.y += rowRectangle.height;
      result.bottomTruncated = !(rowIndex == rows.length && minutes == 0);
    }
    return result;
  }

  function addEventElement(event) {
    var eventElement = document.createElement("div");
    eventElement._event = event;
    event.mainElement = eventElement;
    eventElement._weekTable = weekTable;

    O$.Timetable._createEventContentElements(eventElement, eventContent, eventContentClasses);

    eventElement._attachAreas = function() {
      eventElement._areas = [];
      for (var areaIndex = 0, areaCount = eventAreaSettings.length; areaIndex < areaCount; areaIndex++) {
        var areaSettings = eventAreaSettings[areaIndex];
        var areaId = areaSettings.id;
        var areaClientId = weekTable.id + "::" + event.id + ":" + areaId;
        var area = O$(areaClientId);
        if (!area)
          continue;
        area.onmousedown = O$.stopEvent;
        area.onclick = O$.stopEvent;
        eventElement._areas.push(area);

        var putAreaInElement = O$.isAlignmentInsideOfElement(areaSettings.horizontalAlignment, areaSettings.verticalAlignment);
        if (putAreaInElement) {
          var firstEventChild = eventElement.firstChild;
          if (firstEventChild) {
            // insert as a first element to allow configuring areas as floating elements by the element's top edge using
            // area styling attributes, e.g. "position: static; float: right"
            eventElement.insertBefore(area, firstEventChild);
          } else
            eventElement.appendChild(area);
        } else
          absoluteElementsParentNode.appendChild(area);
        area._insideElement = putAreaInElement;
        area._settings = areaSettings;
        area._updatePos = function() {
          O$.alignPopupByElement(this, eventElement, this._settings.horizontalAlignment, this._settings.verticalAlignment, 0, 0, true, true);
        };
      }
    };
    eventElement._attachAreas();

    eventElement._updateAreaPositions = function(forceInsideAreasUpdate) {
      for (var areaIndex = 0, areaCount = this._areas.length; areaIndex < areaCount; areaIndex++) {
        var area = this._areas[areaIndex];
        if (!area._insideElement || forceInsideAreasUpdate)
          area._updatePos();
      }
    };
    eventElement._updateAreaZIndexes = function(eventZIndex) {
      if (eventZIndex === undefined)
        eventZIndex = O$.getNumericElementStyle(event.mainElement, "z-index");

      for (var areaIndex = 0, areaCount = this._areas.length; areaIndex < areaCount; areaIndex++) {
        var area = this._areas[areaIndex];
        area.style.zIndex = eventZIndex + 1;
      }
    };

    O$.assignEvents(eventElement, uiEvent, true, {timetableEvent: event});
    eventElement._onmouseover = eventElement.onmouseover;
    eventElement._onmouseout = eventElement.onmouseout;
    eventElement.onmouseover = eventElement.onmouseout = null;

    var eventClass = event.type != "reserved" ? eventStyleClass : reservedTimeEventClass;
    if (O$.isExplorer())
      O$.combineClassNames([eventClass, "o_explicitly_transparent_background"]);
    eventElement.className = eventClass;
    eventElement.style.margin = "0"; // margin in CSS is for calculating eventsLeftOffset/eventsRightOffset only -- it should be reset to avoid unwanted effects
    eventElement.style.zIndex = weekTable._baseZIndex + 5;

    eventElement._backgroundElement = document.createElement("div");
    eventElement._backgroundElement.className = eventBackgroundStyleClassName;
    eventElement._backgroundElement.style.zIndex = weekTable._baseZIndex + 4;
    event.backgroundElement = eventElement._backgroundElement;

    function canEventBeDropppedHere(event) {
      var startTime = event.start.getTime();
      var endTime = event.end.getTime();
      var resourceId = event.resourceId;
      for (var i = 0, count = weekTable._weekEvents.length; i < count; i++) {
        var currEvent = weekTable._weekEvents[i];
        if (currEvent == event)
          continue;
        if (currEvent.type != "reserved" && editingOptions.overlappedEventsAllowed)
          continue;
        if (currEvent.resourceId && resourceId && currEvent.resourceId != resourceId)
          continue;
        var timeSpansIntersect =
                currEvent.end.getTime() > startTime &&
                currEvent.start.getTime() < endTime;
        if (timeSpansIntersect)
          return false;
      }
      return true;
    }

    function setupDragAndDrop() {
      var eventPreview = getEventPreview();

      eventElement._updateDropAllowed = function() {
        var dropAllowed = canEventBeDropppedHere(event);
        if (dropAllowed) {
          eventElement._lastValidStart = event.start;
          eventElement._lastValidEnd = event.end;
          eventElement._lastValidResourceId = event.resourceId;
        }
        eventElement._setDropAllowed(dropAllowed);
      };
      eventElement._setDropAllowed = function(value) {
        if (this._dropAllowed == value)
          return;
        this._dropAllowed = value;

        O$.runTransitionEffect(eventElement, ["opacity"], [value ? 1.0 : 1.0 - undroppableEventTransparency], undroppableStateTransitionPeriod, undefined, {
          onupdate: function() {
            if (this.propertyValues.opacity !== undefined)
              O$.setOpacityLevel(eventElement._backgroundElement, this.propertyValues.opacity * (1 - eventBackgroundTransparency));
          }
        });
      };
      eventElement.onmousedown = function (e) {
        weekTable._resetScrollingCache();
        eventElement._bringToFront();
        O$.startDragging(e, this);
        eventElement._initialStart = eventElement._lastValidStart = event.start;
        eventElement._initialEnd = eventElement._lastValidEnd = event.end;
        eventElement._initialResourceId = eventElement._lastValidResourceId = event.resourceId;
        eventElement._originalCursor = O$.getElementStyle(eventElement, "cursor");
        eventElement._dropAllowed = true;
      };

      function hideExcessiveElementsWhileDragging() {
        if (eventPreview)
          setTimeout(function() {
            eventPreview.hide();
          }, 100);
      }

      eventElement.setPosition = function (left, top) {
        if (topResizeHandle)
          topResizeHandle.style.display = "none";
        if (bottomResizeHandle)
          bottomResizeHandle.style.display = "none";

        var eventWeekday = O$.WeekTable.getEventWeekday(weekTable, event);
        var nearestTimeslot = getNearestTimeslotForPosition(left, top, eventWeekday);
        var newStartTime = nearestTimeslot.time;
        var newResource = editingOptions.eventResourceEditable ? nearestTimeslot.resource : undefined;
        var eventUpdated = false;
        if (event.resourceId && newResource !== undefined) {
          if (event.resourceId != newResource.id) {
            event.resourceId = newResource.id;
            eventUpdated = true;
          }
        }
        var timeIncrement = newStartTime.getTime() - event.start.getTime();
        if (timeIncrement != 0) {
          var newEndTime = O$.dateByTimeMillis(event.end.getTime() + timeIncrement);
          event.setStart(newStartTime);
          event.setEnd(newEndTime);
          eventUpdated = true;
        }
        if (eventUpdated) {
          eventElement._updateDropAllowed();
          eventElement.style.cursor = "move";//eventElement._setDropAllowed ? "move" : this._originalCursor;
          if (!event._draggingInProgress) {
            event._draggingInProgress = true;
            weekTable._draggingInProgress = true;
            hideExcessiveElementsWhileDragging();
          }
          event.mainElement._updatePos(true, dragAndDropTransitionPeriod, {
            onupdate: function() {
              event._scrollIntoView();
            }
          });

        }
      };
      eventElement.ondragend = function() {
        if (topResizeHandle)
          topResizeHandle.style.display = "";
        if (bottomResizeHandle)
          bottomResizeHandle.style.display = "";

        setTimeout(function() {
          if (event._draggingInProgress) {
            var draggingCanceled = false;
            var dropAllowed = canEventBeDropppedHere(event);
            if (!dropAllowed) {
              event.setStart(eventElement._initialStart);//eventElement._lastValidStart);
              event.setEnd(eventElement._initialEnd);//eventElement._lastValidEnd);
              event.resourceId = eventElement._initialResourceId;//eventElement._lastValidResourceId;
              draggingCanceled = true;
            }
            eventElement._setDropAllowed(true);
            eventElement.style.cursor = eventElement._originalCursor;

            if (event.start.getTime() >= weekTable._endTime.getTime() ||
                event.end.getTime() <= weekTable._startTime.getTime()) {
              weekTable._updateEventElements(true);
            } else {
              event.mainElement._updatePos(false, dragAndDropCancelingPeriod, {
                onupdate: function() {
                  event._scrollIntoView();
                }
              });
            }

            event._draggingInProgress = undefined;
            weekTable._draggingInProgress = undefined;

            if (!draggingCanceled) {
              putTimetableChanges(null, [event], null);
            } else {
              event._setMouseInside(false);
            }
          }

        }, 10);
      };
      eventElement._updateResizersPos = function(draggingInProgress) {
        if (!draggingInProgress) {
          var eventRect = event.mainElement._rect;
          if (topResizeHandle)
            O$.setElementBorderRectangle(topResizeHandle, new O$.Rectangle(eventRect.x, eventRect.y - eventResizeHandleHeight / 2, eventRect.width, eventResizeHandleHeight));
          if (bottomResizeHandle)
            O$.setElementBorderRectangle(bottomResizeHandle, new O$.Rectangle(eventRect.x, eventRect.getMaxY() - eventResizeHandleHeight / 2, eventRect.width, eventResizeHandleHeight));
        }
        this._updateZIndex();
      };
      eventElement._updateZIndex = function(eventZIndex) {
        if (eventZIndex === undefined)
          eventZIndex = O$.getNumericElementStyle(event.mainElement, "z-index");
        if (topResizeHandle)
          topResizeHandle.style.zIndex = eventZIndex + 2;
        if (bottomResizeHandle)
          bottomResizeHandle.style.zIndex = eventZIndex + 2;
        this._updateAreaZIndexes();
      };

      if (editingOptions.eventDurationEditable) {
        var topResizeHandle = editingOptions.eventDurationEditable ? document.createElement("div") : null;
        var bottomResizeHandle = editingOptions.eventDurationEditable ? document.createElement("div") : null;
        topResizeHandle.style.fontSize = bottomResizeHandle.style.fontSize = "0px";
        topResizeHandle.style.position = bottomResizeHandle.style.position = "absolute";
        topResizeHandle.style.cursor = "n-resize";
        bottomResizeHandle.style.cursor = "s-resize";

        O$.fixIEEventsForTransparentLayer(topResizeHandle);
        O$.fixIEEventsForTransparentLayer(bottomResizeHandle);

        topResizeHandle.onclick = bottomResizeHandle.onclick = function(e) {
          O$.breakEvent(e);
        };
        topResizeHandle.onmousedown = bottomResizeHandle.onmousedown = eventElement.onmousedown;
        topResizeHandle.setPosition = bottomResizeHandle.setPosition = function(left, top) {
          var eventWeekday = O$.WeekTable.getEventWeekday(weekTable, event);
          var nearestTimeslot = getNearestTimeslotForPosition(left, top + eventResizeHandleHeight / 2, eventWeekday);
          var eventUpdated = false;
          if (this == topResizeHandle) {
            if (event.end.getTime() - nearestTimeslot.time < shortestEventTimeWhileResizing)
              nearestTimeslot.time = O$.dateByTimeMillis(event.end.getTime() - shortestEventTimeWhileResizing);
            if (event.start.getTime() != nearestTimeslot.time) {
              event.setStart(nearestTimeslot.time);
              eventUpdated = true;
            }
          } else {
            if (nearestTimeslot.time - event.start.getTime() < shortestEventTimeWhileResizing)
              nearestTimeslot.time = O$.dateByTimeMillis(event.start.getTime() + shortestEventTimeWhileResizing);
            if (event.end.getTime() != nearestTimeslot.time) {
              event.setEnd(nearestTimeslot.time);
              eventUpdated = true;
            }
          }
          if (eventUpdated) {
            event.mainElement._updatePos(true, dragAndDropTransitionPeriod, {
              onupdate: function() {
                event._scrollIntoView();
              }
            });
            eventElement._updateDropAllowed();
          }
          if (eventUpdated && !event._draggingInProgress) {
            event._draggingInProgress = true;
            weekTable._draggingInProgress = true;
            hideExcessiveElementsWhileDragging();
          }
          eventElement._updateResizersPos();
        };
        topResizeHandle.ondragend = bottomResizeHandle.ondragend = eventElement.ondragend;

        function setResizerHoverState(mouseInside, resizer) {
          resizer._mouseInside = mouseInside;
          O$.invokeFunctionAfterDelay(event._updateRolloverState, O$.WeekTable.EVENT_ROLLOVER_STATE_UPDATE_TIMEOUT);
        }

        O$.setupHoverStateFunction(topResizeHandle, setResizerHoverState);
        O$.setupHoverStateFunction(bottomResizeHandle, setResizerHoverState);
      }

      eventElement._topResizeHandle = topResizeHandle;
      eventElement._bottomResizeHandle = bottomResizeHandle;
      if (topResizeHandle)
        absoluteElementsParentNode.appendChild(topResizeHandle);
      if (bottomResizeHandle)
        absoluteElementsParentNode.appendChild(bottomResizeHandle);
      eventElement._removeNodes = function() {
        if (topResizeHandle)
          absoluteElementsParentNode.removeChild(topResizeHandle);
        if (bottomResizeHandle)
          absoluteElementsParentNode.removeChild(bottomResizeHandle);
        var areas = eventElement._areas;
        for (var i = 0, count = areas.length; i < count; i++) {
          var area = areas[i];
          if (area.parentNode == null)
            continue; // don't add an area back to document if it was already removed by Ajax 
          hiddenArea.appendChild(area);
        }
      };
    }

    if (event.type != "reserved" && editable) {
      setupDragAndDrop();
    }

    eventElement._update = function(transitionPeriod) {
      this._updatePos(false, transitionPeriod);
      if (event.type != "reserved") {
        O$.Timetable._updateEventContentElements(eventElement, event, weekTable);
      }

      var calculatedEventColor = event.color ? event.color : defaultEventColor;
      if (event.type == "reserved") {
        calculatedEventColor = reservedTimeEventColor;
      }
      eventElement._color = calculatedEventColor;
      eventElement._backgroundColor = O$.blendColors(eventElement._color, "#ffffff", 1 - eventBackgroundIntensity);

      var userSpecifiedStyles = O$.getStyleClassProperties(
              event.type != "reserved"
                      ? (uiEvent.style ? uiEvent.style : stylingParams.eventClass)
                      : stylingParams.reservedTimeEventClass,
              ["color", "background-color", "border-color"]);
      eventElement._backgroundElement.style.backgroundColor = userSpecifiedStyles.backgroundColor
              ? userSpecifiedStyles.backgroundColor : eventElement._backgroundColor;
      var elementStyles = O$.getElementStyle(eventElement, ["border-radius", "-moz-border-radius-topleft", "-webkit-border-top-left-radius"]);
      eventElement._backgroundElement.style.borderRadius = elementStyles.borderRadius;
      eventElement._backgroundElement.style.MozBorderRadius = elementStyles.MozBorderRadiusTopleft;
      eventElement._backgroundElement.style.WebkitBorderRadius = elementStyles.WebkitBorderTopLeftRadius;

      O$.setOpacityLevel(eventElement._backgroundElement, 1 - eventBackgroundTransparency);
      eventElement.style.color = userSpecifiedStyles.color ? userSpecifiedStyles.color : eventElement._color;
      eventElement.style.borderColor = userSpecifiedStyles.borderColor ? userSpecifiedStyles.borderColor : eventElement._color;
    };
    eventElement._updatePos = function(draggingInProgress, transitionPeriod, transitionEvents) {
      var resourceColIndex;
      if (event.resourceId) {
        var resource = weekTable._getResourceForEvent(event);
        if (!resource) {
          this.style.display = "none";
          return;
        }
        resourceColIndex = resource._colIndex;
      }
      this.style.display = "";
      var firstDataRow = table.body._getRows()[0];
      var weekday = O$.WeekTable.getEventWeekday(weekTable, event);
      var leftColIndex = weekday * columnsInWeekday + (resourceColIndex != undefined ? resourceColIndex : 1);
      var leftColBoundaries = O$.getElementBorderRectangle(firstDataRow._cells[leftColIndex], true, weekTable._getLayoutCache());
      var rightColIndex = weekday * columnsInWeekday + (resourceColIndex != undefined ? resourceColIndex : columnsInWeekday);
      var rightColBoundaries = O$.getElementBorderRectangle(firstDataRow._cells[rightColIndex], true, weekTable._getLayoutCache());
      var top = getVertOffsetByTime(event.start);
      var isCrossDay = ! O$.WeekTable.isSameDay(event.start, event.end);
      var bottom = getVertOffsetByTime(event.end, true, isCrossDay);
      var x1 = leftColBoundaries.getMinX() + (event.type != "reserved" ? eventsLeftOffset : reservedEventsLeftOffset);
      var x2 = rightColBoundaries.getMaxX() - (event.type != "reserved" ? eventsRightOffset : reservedEventsRightOffset);
      if (O$.isExplorer() && O$.isStrictMode() && (resourceColIndex === undefined || resourceColIndex == columns.length - 1)) {
        var scroller = O$(weekTable.id + "::scroller");
        var scrollerWidth = scroller.offsetWidth - scroller.clientWidth;
        x2 -= scrollerWidth;
      }
      var rect = new O$.Rectangle(Math.round(x1), Math.round(top.y),
              Math.round(x2 - x1), Math.round(bottom.y - top.y));
      this._rect = rect;
      if (!transitionPeriod)
        transitionPeriod = 0;
      var backgroundElement = this._backgroundElement;
      if (this._lastRectangleTransition && this._lastRectangleTransition.active)
        this._lastRectangleTransition.stop(1.0);
      var events = {
        onupdate: function() {
          var currentRect = this.propertyValues.rectangle;
          if (currentRect)
            O$.setElementBorderRectangle(backgroundElement, currentRect);
          if (transitionEvents && transitionEvents.onupdate)
            transitionEvents.onupdate();
          eventElement._currentRect = currentRect;
          eventElement._updateAreaPositions(false);
        }
      };
      if (transitionEvents)
        events.oncomplete = transitionEvents.oncomplete;
      this._lastRectangleTransition = O$.runTransitionEffect(this, ["rectangle"], [rect], transitionPeriod, 20, events);

      if (eventElement._updateResizersPos)
        eventElement._updateResizersPos(draggingInProgress);
      var eventZIndex = O$.getNumericElementStyle(this, "z-index");
      this._backgroundElement.style.zIndex = eventZIndex - 1;
      if (bottom.bottomTruncated)
        O$.appendClassNames(this, ["o_truncatedTimetableEvent"]);
      else
        O$.excludeClassNames(this, ["o_truncatedTimetableEvent"]);
      this._updateAreaPositions(true);
    };
    eventElement._bringToFront = function() {
      var index = O$.findValueInArray(this, weekTable._eventElements);
      O$.assert(index != -1, "eventElement._bringToFront. Can't find element in _eventElements array.");
      weekTable._eventElements.splice(index, 1);
      weekTable._eventElements.push(this);
      weekTable._updateEventZIndexes();
    };

    event._updateRolloverState = function() {
      var eventElement = event.mainElement;
      if (!eventElement) {
        // this can be the case because _updateRolloverState is invoked by time-out, so if mouseOver/mouseOut happens
        // just before element is replaced with Ajax, this call will be made when there's no original element anymore
        return;
      }
      var actionBar = getEventActionBar();
      var elementResizable = eventElement._topResizeHandle || eventElement._bottomResizeHandle;
      event._setMouseInside(eventElement._mouseInside ||
                            elementResizable && (eventElement._topResizeHandle._mouseInside || eventElement._bottomResizeHandle._mouseInside) ||
                            (actionBar._event == event && actionBar._actionsArea._mouseInside));
    };

    var eventPreview = getEventPreview();
    event._setMouseInside = function(value) {
      if (event._mouseInside == value)
        return;
      event._mouseInside = value;
      if (event._draggingInProgress)
        return;
      if (event.type == "reserved")
        return;
      if (value) {
        O$.setStyleMappings(eventElement, {_rolloverStyle: rolloverEventClass});
        O$.setElementBorderRectangle(eventElement, eventElement._rect);
        eventElement._updateAreaPositions(true);
        showEventActionBar(event);

        if (eventPreview) {
          setTimeout(function() {
            if (event._mouseInside && !event._draggingInProgress)
              eventPreview.showForEvent(event);
          }, eventPreview._showingDelay);
        }
        if (eventElement._onmouseover) {
          eventElement._onmouseover(O$.createEvent("mouseover"));
        }
      } else {
        O$.setStyleMappings(eventElement, {_rolloverStyle: null});
        O$.setElementBorderRectangle(eventElement, eventElement._currentRect);
        eventElement._updateAreaPositions(true);
        hideEventActionBar();

        if (eventPreview) {
          eventPreview.hide();
        }
        if (eventElement._onmouseout) {
          eventElement._onmouseout(O$.createEvent("mouseout"));
        }
      }
    };

    O$.setupHoverStateFunction(eventElement, function(mouseInside) {
      if (event._creationInProgress)
        return;
      eventElement._mouseInside = mouseInside;
      O$.invokeFunctionAfterDelay(event._updateRolloverState, O$.WeekTable.EVENT_ROLLOVER_STATE_UPDATE_TIMEOUT);
    });

    if (editable) {
      eventElement.onclick = function(e) {
        O$.breakEvent(e);
        if (event._draggingInProgress)
          return;
        if (event.type == "reserved")
          return;
        weekTable._getEventEditor().run(event, "update");
      };
    }

    if (eventElement.oncreate)
      eventElement.oncreate(O$.createEvent("create"));
    absoluteElementsParentNode.appendChild(eventElement);
    absoluteElementsParentNode.appendChild(eventElement._backgroundElement);
    eventElement._update();
    return eventElement;
  }

  function removeEventElement(event) {
    if (!event.mainElement)
      return;
    if (getEventActionBar()._event == event)
      hideEventActionBar();

    if (event.mainElement._removeNodes)
      event.mainElement._removeNodes();
    event.mainElement.parentNode.removeChild(event.mainElement);
    var backgroundElement = event.mainElement._backgroundElement;
    backgroundElement.parentNode.removeChild(backgroundElement);
    event.mainElement._event = null;
    event.mainElement = null;
    event.backgroundElement = null;
  }

  function getEventActionBar() {
    if (!weekTable._eventActionBar) {
      weekTable._eventActionBar = O$(weekTable.id + ":_eventActionBar");
      if (!weekTable._eventActionBar)
        return null;
      weekTable._eventActionBar.style.position = "absolute";
      weekTable._eventActionBar.style.visibility = "hidden";

    }
    return weekTable._eventActionBar;
  }

  function getEventPreview() {
    if (!weekTable._eventPreview) {
      weekTable._eventPreview = O$(weekTable.id + ":_eventPreview");
    }
    return weekTable._eventPreview;
  }

  function showEventActionBar(event) {
    var eventElement = event.mainElement;
    var actionBar = getEventActionBar();
    actionBar._event = event;
    var userSpecifiedStyles = O$.getStyleClassProperties(actionBar._userSpecifiedClass, ["color", "background-color"]);
    actionBar.style.backgroundColor = userSpecifiedStyles.backgroundColor
            ? userSpecifiedStyles.backgroundColor
            : O$.blendColors(eventElement._color, "#ffffff", 1 - actionBar._inactiveSegmentIntensity);
    eventElement.appendChild(actionBar);
    actionBar.style.height = "";
    actionBar.style.width = "";
    var barHeight = actionBar.offsetHeight;
    var actionsAreaHeight = actionBar._actionsArea._getHeight();
    if (barHeight < actionsAreaHeight)
      barHeight = actionsAreaHeight;
    var borderLeftWidth = O$.getNumericElementStyle(eventElement, "border-left-width");
    var borderRightWidth = O$.getNumericElementStyle(eventElement, "border-right-width");
    O$.setElementSize(actionBar, {width: eventElement._rect.width - borderLeftWidth - borderRightWidth,
      height: barHeight});
    actionBar.style.left = "0px";
    actionBar.style.bottom = "0px";
    actionBar.style.visibility = "visible";
    actionBar._actionsArea.style.visibility = "visible";
    actionBar._update();
  }

  function hideEventActionBar() {
    var actionBar = getEventActionBar();
    if (!actionBar._event)
      return;
    var eventElement = actionBar._event.mainElement;
    actionBar._lastEditedEvent = actionBar._event;
    actionBar._event = null;
    eventElement.removeChild(actionBar);
    actionBar.style.visibility = "hidden";
    actionBar._actionsArea.style.visibility = "hidden";
  }

  weekTable.cancelEventCreation = function(event) {
    event._creationInProgress = undefined;
    removeEventElement(event);
  };

  weekTable.addEvent = function(event) {
    event.setStart(event.start, event.startStr);
    event.setEnd(event.end, event.endStr);
    if (event._creationInProgress) {
      event._creationInProgress = undefined;
      removeEventElement(event);
    }

    eventProvider.addEvent(event);
    weekTable._updateEventElements(true);
    putTimetableChanges([event], null, null);
  };

  weekTable.deleteEvent = function(event) {
    eventProvider.deleteEvent(event);
    weekTable._updateEventElements(true);
    putTimetableChanges(null, null, [event.id]);
  };

  weekTable.getEventById = function(eventId) {
    return eventProvider.getEventById(eventId);
  };

  weekTable.updateEvent = function(event) {
    event.setStart(event.start, event.startStr);
    event.setEnd(event.end, event.endStr);

    event.updatePresentation();
    putTimetableChanges(null, [event], null);
  };

  weekTable.refreshEvents = function(serverAction) {
    this._saveChanges(true, serverAction, weekTable._startTime, weekTable._endTime);
  };

  weekTable.saveChanges = function() {
    this._saveChanges(false, null, weekTable._startTime, weekTable._endTime);
  };

  weekTable._saveChanges = function(reloadAllEvents, serverAction, reloadStartTime, reloadEndTime) {
    O$.requestComponentPortions(weekTable.id, ["saveEventChanges"], JSON.stringify(
    {reloadAllEvents: !!reloadAllEvents, startTime: O$.formatDateTime(reloadStartTime), endTime: O$.formatDateTime(reloadEndTime)},
            ["reloadAllEvents", "startTime", "endTime"]), function(
            component, portionName, portionHTML, portionScripts, portionData) {
      var remainingElements = O$.replaceDocumentElements(portionHTML, true);
      if (remainingElements.hasChildNodes())
        hiddenArea.appendChild(remainingElements);
      O$.executeScripts(portionScripts);

      if (portionData.reloadedEvents) {
        eventProvider.setEvents(portionData.reloadedEvents, reloadStartTime, reloadEndTime);
        weekTable._updateEventElements(true, true);
      } else {
        if (portionData.addedEvents) {
          var addedCount = portionData.addedEvents.length;
          O$.assertEquals(weekTable._addedEvents.length, addedCount, "addedEventCount should be same as weekTable._addedEvents.length");
          for (var addedIdx = 0; addedIdx < addedCount; addedIdx++) {
            var addedEvent = weekTable._addedEvents[addedIdx];
            addedEvent._copyFrom(portionData.addedEvents[addedIdx]);
            addedEvent.updatePresentation(dragAndDropCancelingPeriod);
            addedEvent.mainElement._attachAreas();
            addedEvent.mainElement._updateAreaPositions();
          }
        }
        if (portionData.editedEvents) {
          var editedCount = portionData.editedEvents.length;
          O$.assertEquals(weekTable._editedEvents.length, editedCount, "editedEventCount should be same as weekTable._editedEvents.length");
          for (var editedIdx = 0; editedIdx < editedCount; editedIdx++) {
            var editedEvent = weekTable._editedEvents[editedIdx];
            editedEvent._copyFrom(portionData.editedEvents[editedIdx]);
            editedEvent.mainElement._attachAreas();
            editedEvent.updatePresentation(dragAndDropCancelingPeriod);
          }
        }
      }

      weekTable._addedEvents = [];
      weekTable._editedEvents = [];
      weekTable._removedEventIds = [];
      updateTimetableChangesField();
    }, function () {
      alert('Error saving the last timetable change');
    }, serverAction);
  };

  weekTable._dayTextElement = O$(weekTable.id + "::dayText");

  weekTable.getDay = function() {
    return weekTable._day;
  };

  weekTable.setDay = function(day) {
    if (O$._datesEqual(weekTable._day, day))
      return;
    if (weekTable._onDayChange) {
      weekTable._onDayChange(day);
    }

    var dtf = O$.getDateTimeFormatObject(locale);
    O$.setHiddenField(weekTable, weekTable.id + "::day", dtf.format(day, "dd/MM/yyyy"));

    weekTable._day = day;
    var firstDay = O$.WeekTable.getFirstDay(day, firstDayOfWeek);
    weekTable._firstDay = firstDay;
    weekTable._startTime = O$.parseTime(startTimeStr, O$.cloneDate(firstDay));
    weekTable._endTime = O$.parseTime(endTimeStr, O$.incDay(O$.cloneDate(firstDay), 6));
    weekTable._weekEvents = eventProvider._getEventsForPeriod(weekTable._startTime, weekTable._endTime, function() {
      weekTable._updateEventElements(true, true);
    });

    weekTable._updateEventElements();

    var rows = table.body._getRows();
    for (var rowIndex = 0, rowCount = rows.length; rowIndex < rowCount; rowIndex++) {
      var row = rows[rowIndex];
      row._updateTime(firstDay);
    }

    var weekdayHeaderRow = weekdayHeadersTable.body._getRows()[0];

    var cellDay = firstDay;
    for (var weekdayHeaderCellIndex = 1; weekdayHeaderCellIndex < weekdayHeaderRow._cells.length - 1; weekdayHeaderCellIndex++) {
      var weekdayHeaderCell = weekdayHeaderRow._cells[weekdayHeaderCellIndex];
      O$.removeAllChildNodes(weekdayHeaderCell);
      var weekdayHeaderCellText = dtf.format(cellDay, weekdayPattern);
      var weekdayHeaderCellStyledText = O$.createStyledText(weekdayHeaderCellText, weekdayStyle);
      weekdayHeaderCell.appendChild(weekdayHeaderCellStyledText);      
      cellDay = O$.incDay(cellDay);
    }
  };

  weekTable._updateEventElements = function(reacquireDayEvents, refreshAreasAfterReload) {
    weekTable._baseZIndex = O$.getElementZIndex(weekTable);
    if (weekTable._eventElements)
      for (var elementIndex = 0, elementCount = weekTable._eventElements.length; elementIndex < elementCount; elementIndex++) {
        var eventElement = weekTable._eventElements[elementIndex];
        if (refreshAreasAfterReload)
          eventElement._attachAreas();
        removeEventElement(eventElement._event);
      }

    weekTable._eventElements = [];
    if (reacquireDayEvents)
      weekTable._weekEvents = eventProvider._getEventsForPeriod(weekTable._startTime, weekTable._endTime, function() {
        weekTable._updateEventElements(true, true);
      });
    for (var eventIndex = 0, eventCount = weekTable._weekEvents.length; eventIndex < eventCount; eventIndex++) {
      var event = weekTable._weekEvents[eventIndex];
      weekTable._eventElements.push(addEventElement(event));
    }
    weekTable._updateEventZIndexes();
  };

  weekTable._baseZIndex = O$.getElementZIndex(weekTable);
  weekTable._maxZIndex = weekTable._baseZIndex + 10;
  weekTable._updateEventZIndexes = function() {
    if (!weekTable._eventElements)
      return;
    for (var elementIndex = 0, elementCount = weekTable._eventElements.length; elementIndex < elementCount; elementIndex++) {
      var eventElement = weekTable._eventElements[elementIndex];
      var eventZIndex = weekTable._baseZIndex + (elementIndex + 1) * 5;
      eventElement.style.zIndex = eventZIndex;
      eventElement._backgroundElement.style.zIndex = eventZIndex - 1;
      if (eventElement._updateZIndex)
        eventElement._updateZIndex(eventZIndex);
    }
    weekTable._maxZIndex = eventZIndex + 10;
  };

  weekTable.previousWeek = function() {
    var prevDay = O$.incDay(weekTable._day, -7);
    weekTable.setDay(prevDay);
  };

  weekTable.nextWeek = function() {
    var nextDay = O$.incDay(weekTable._day, 7);
    weekTable.setDay(nextDay);
  };

  weekTable.currentWeek = function() {
    var today = new Date();
    weekTable.setDay(today);
  };

  var dtf = O$.getDateTimeFormatObject(locale);
  weekTable.setDay(dtf.parse(day, "dd/MM/yyyy"));

  weekTable._addEvent = function(startTime, resourceId) {
    var endTime = O$.cloneDateTime(startTime);
    endTime.setMinutes(startTime.getMinutes() + editingOptions.defaultEventDuration);
    var event = {
      name: "",
      resourceId: resourceId,
      start: startTime,
      end: endTime,
      color: null,
      description: ""
    };
    O$.Timetable._initEvent(event);
    addEventElement(event);
    event._creationInProgress = true;
    weekTable._getEventEditor().run(event, "create");
  };

  weekTable.updateLayout = function() {
    weekTable._cachedPositions = {};
    weekTable._declaredWeekTableHeight = O$.getStyleClassProperty(weekTable.className, "height");
    if (weekTable._declaredWeekTableHeight === undefined) {
      weekTable._scroller.style.overflow = "visible";
      weekTable._scroller.style.overflowX = "visible";
      weekTable._scroller.style.overflowY = "hidden";
      weekTable._scroller.style.height = "auto";
    } else {
      if (O$.isOpera()) {
        weekTable._scroller.style.overflow = "scroll"; // Opera < 9.5 doesn't understand specifying just overflow-y
      }
    }

    updateHeightForFF();
    accountForScrollerWidth();
    absoluteElementsParentNode._updatePos();
    for (var eventIndex = 0, eventCount = weekTable._weekEvents.length; eventIndex < eventCount; eventIndex++) {
      var event = weekTable._weekEvents[eventIndex];
      event.updatePresentation();
    }

  };

  O$.addEventHandler(window, "resize", function() {
    weekTable.updateLayout();
  });
  O$.addInternalLoadEvent(function() {
    weekTable.updateLayout(); // update positions after layout changes that might have had place during loading

    var scrollOffset = getVertOffsetByTime(scrollTime).y;
    var maxScrollOffset = weekTable._scroller.scrollHeight - O$.getElementSize(weekTable._scroller).height;
    if (maxScrollOffset < 0)
      maxScrollOffset = 0;
    if (scrollOffset > maxScrollOffset)
      scrollOffset = maxScrollOffset;
    weekTable._scroller.scrollTop = scrollOffset;
    O$.addEventHandler(weekTable._scroller, "scroll", function() {
      var timeslot = getNearestTimeslotForPosition(10, weekTable._scroller.scrollTop);
      O$.setHiddenField(weekTable, weekTable.id + "::scrollPos", O$.formatTime(timeslot.timeAtPosition));
    });
  });

  function updateHeightForFF() {
    // FireFox's scroller height includes the entire table without truncating it according to
    // user-specified height in day table, so we should truncate height ourselves
    if (!O$.isMozillaFF())
      return;

    if (weekTable._declaredWeekTableHeight === undefined)
      return;
    var scrollerHeight = weekTable._declaredWeekTableHeight;
    if (!O$.stringEndsWith(weekTable._declaredWeekTableHeight, "%")) {
      var height = O$.calculateNumericCSSValue(weekTable._declaredWeekTableHeight);
      if (height) {
        var offset = O$.getElementPos(weekTable._scroller).y - O$.getElementPos(weekTable).y;
        height -= offset;
        scrollerHeight = height + "px";
      }
    }
    weekTable._scroller.style.height = scrollerHeight;
  }

  function accountForScrollerWidth() {
    var firstDataRow = table.body._getRows()[0];
    var visibleDataWidth = O$.getElementBorderRectangle(firstDataRow._cells[firstDataRow._cells.length - 1]).getMaxX() - O$.getElementPos(firstDataRow._cells[0]).x;
    
    var weekdayHeaderRow = weekdayHeadersTable.body._getRows()[0];
    var totalWeekdayHeaderWidth = O$.getElementBorderRectangle(weekdayHeaderRow._cells[weekdayHeaderRow._cells.length - 1]).getMaxX() - O$.getElementPos(weekdayHeaderRow._cells[0]).x;
    var lastHeaderColWidth = totalWeekdayHeaderWidth - visibleDataWidth;
    if (lastHeaderColWidth < 0) // can be the case under Mozilla3 because O$.getElementBorderRectangle returns non-rounded coordinates, which may result in values like -0.2499...
      lastHeaderColWidth = 0;
    if (lastHeaderColWidth == 0 && O$.isOpera())
      lastHeaderColWidth = 1;
    weekdayHeaderRow._cells[weekdayHeaderRow._cells.length - 1].style.width = lastHeaderColWidth + "px";

    if (useResourceSeparation) {
      var resourceHeaderRow = resourceHeadersTable.body._getRows()[0];
      resourceHeaderRow._cells[resourceHeaderRow._cells.length - 1].style.width = lastHeaderColWidth + "px";
    }
  }

  updateHeightForFF();

  function putTimetableChanges(addedEvents, changedEvents, removedEventIds, initialAssignment) {
    if (!weekTable._addedEvents) weekTable._addedEvents = [];
    if (!weekTable._editedEvents) weekTable._editedEvents = [];
    if (!weekTable._removedEventIds) weekTable._removedEventIds = [];
    if (addedEvents)
      weekTable._addedEvents = weekTable._addedEvents.concat(addedEvents);
    if (changedEvents) {
      for (var editedIdx = 0, editedCount = changedEvents.length; editedIdx < editedCount; editedIdx++) {
        var editedEvent = changedEvents[editedIdx];
        if (O$.findValueInArray(editedEvent, weekTable._addedEvents) != -1)
          continue;
        if (O$.findValueInArray(editedEvent, weekTable._editedEvents) == -1) {
          weekTable._editedEvents.push(editedEvent);
        }
      }
    }
    if (removedEventIds) {
      function eventIndexById(events, eventId) {
        for (var i = 0, count = events.length; i < count; i++) {
          var event = events[i];
          if (event.id == eventId)
            return i;
        }
        return -1;
      }

      for (var removedIdx = 0, removedCount = removedEventIds.length; removedIdx < removedCount; removedIdx++) {
        var removedEventId = removedEventIds[removedIdx];
        var addedEventIndex = eventIndexById(weekTable._addedEvents, removedEventId);
        if (addedEventIndex != -1) {
          weekTable._addedEvents.splice(addedEventIndex, 1);
          continue;
        }
        var editedEventIndex = eventIndexById(weekTable._editedEvents, removedEventId);
        if (editedEventIndex != -1)
          weekTable._editedEvents.splice(editedEventIndex, 1);
        weekTable._removedEventIds.push(removedEventId);
      }
    }

    updateTimetableChangesField();

    if (weekTable.onchange) {
      var e = O$.createEvent("change");
      e.addedEvents = addedEvents ? addedEvents : {};
      e.changedEvents = changedEvents ? changedEvents : {};
      e.removedEventIds = removedEventIds ? removedEventIds : {};

      if (weekTable.onchange(e) === false)
        return;
    }

    if (editingOptions.autoSaveChanges && !initialAssignment)
      weekTable.saveChanges();
  }

  // RichFaces-OpenFaces-JSON compatibility workaround
  // Since some of RichFaces components use JavaScript defining Array.prototype.toJSON method,
  // JSON.stringify([1, 2]) call will produce '"[1,2]"' string instead of expected '["1","2"]'.
  // Therefore perform manual array conversion here.
  function updateTimetableChangesField() {

    var properties = ["id", "name", "description", "resourceId", "startStr", "endStr", "color", "type"];

    function arrayToJSON(name, source, properties) {
      var result = [];
      for (var i = 0; i < source.length; i++)
        result[i] = JSON.stringify(source[i], properties);
      return JSON.stringify(name) + ":[" + result.join(",") + "]";
    }

    var events = [
      arrayToJSON("addedEvents", weekTable._addedEvents, properties),
      arrayToJSON("editedEvents", weekTable._editedEvents, properties),
      arrayToJSON("removedEventIds", weekTable._removedEventIds, properties)
    ];
    var changesAsString = "{" + events.join(",") + "}";
    O$.setHiddenField(weekTable, weekTable.id + "::timetableChanges", changesAsString);
  }

  putTimetableChanges(null, null, null, true);
  O$.assignEvents(weekTable, {onchange: onchange}, true);
};

O$.WeekTable._findEventById = function(events, id) {
  if (events._cachedEventsByIds) {
    return events._cachedEventsByIds[id];
  }
  events._cachedEventsByIds = {};
  for (var i = 0, count = events.length; i < count; i++) {
    var event = events[i];
    events._cachedEventsByIds[event.id] = id;
    if (event.id == id)
      return event;
  }
  return null;
};

O$.WeekTable._LazyLoadedTimetableEvents = function(preloadedEvents, preloadedStartTime, preloadedEndTime) {
  O$.WeekTable._PreloadedTimetableEvents.call(this, []);

  this._setEvents = this.setEvents;
  this.setEvents = function(events, preloadedStartTime, preloadedEndTime) {
    this._setEvents(events);
    this._loadedTimeRangeMap = new O$._RangeMap();
    this._loadingTimeRangeMap = new O$._RangeMap();
    if (!(preloadedStartTime instanceof Date))
      preloadedStartTime = preloadedStartTime ? O$.parseDateTime(preloadedStartTime).getTime() : null;
    if (!(preloadedEndTime instanceof Date))
      preloadedEndTime = preloadedEndTime ? O$.parseDateTime(preloadedEndTime).getTime() : null;
    this._loadedTimeRangeMap.addRange(preloadedStartTime, preloadedEndTime);
    this._loadingTimeRangeMap.addRange(preloadedStartTime, preloadedEndTime);
  };
  this.setEvents(preloadedEvents, preloadedStartTime, preloadedEndTime);

  this._getEventsForPeriod_raw = this._getEventsForPeriod;
  this._getEventsForPeriod = function(start, end, eventsLoadedCallback) {
    if (this._loadedTimeRangeMap.isRangeFullyInMap(start.getTime(), end.getTime()) ||
        this._loadingTimeRangeMap.isRangeFullyInMap(start.getTime(), end.getTime()))
      return this._getEventsForPeriod_raw(start, end);

    this._loadingTimeRangeMap.addRange(start.getTime(), end.getTime());
    var thisProvider = this;
    O$.requestComponentPortions(this._weekTable.id, ["loadEvents"],
            JSON.stringify(
            {startTime: O$.formatDateTime(start), endTime: O$.formatDateTime(end)},
                    ["startTime", "endTime"]),
            function(component, portionName, portionHTML, portionScripts, portionData) {
              var remainingElements = O$.replaceDocumentElements(portionHTML, true);
              if (remainingElements.hasChildNodes())
                thisProvider._weekTable._hiddenArea.appendChild(remainingElements);
              O$.executeScripts(portionScripts);

              var newEvents = portionData.events;
              thisProvider._loadedTimeRangeMap.addRange(start.getTime(), end.getTime());
              thisProvider._events._cachedEventsByIds = null;
              for (var i = 0, count = newEvents.length; i < count; i++) {
                var newEvent = newEvents[i];
                var existingEvent = O$._findEventById(thisProvider._events, newEvent.id);
                if (existingEvent)
                  existingEvent._copyFrom(newEvent);
                else
                  thisProvider.addEvent(newEvent);
              }
              if (eventsLoadedCallback) {
                //        var eventsForPeriod = this._getEventsForPeriod_raw(start, end);
                eventsLoadedCallback();//eventsForPeriod);
              }
            }, function () {
      // todo: revert addition of time range to this._loadingTimeRangeMap
      alert('Error loading timetable events');
    });
    return this._getEventsForPeriod_raw(start, end);
  };
};

O$.WeekTable._PreloadedTimetableEvents = function(events) {

  this._getEventsForPeriod = function(start, end) {
    var result = [];
    var startTime = start.getTime();
    var endTime = end.getTime();
    for (var eventIndex = 0, eventCount = this._events.length; eventIndex < eventCount; eventIndex++) {
      var event = this._events[eventIndex];
      if (event.end.getTime() < event.start.getTime())
        continue;
      if (event.end.getTime() <= startTime ||
          event.start.getTime() >= endTime)
        continue;
      result.push(event);
    }
    return result;
  };

  this.setEvents = function(newEvents) {
    this._events = newEvents;
    for (var eventIndex = 0, eventCount = newEvents.length; eventIndex < eventCount; eventIndex++) {
      var event = newEvents[eventIndex];
      O$.Timetable._initEvent(event);
    }
    this._events._cachedEventsByIds = null;
  };

  this.getEventById = function(eventId) {
    for (var i = 0, count = this._events.length; i < count; i++) {
      var evt = this._events[i];
      if (evt.id == eventId)
        return evt;
    }
    return null;
  };

  this.addEvent = function(event) {
    if (this._events._cachedEventsByIds && event.id)
      this._events._cachedEventsByIds[event.id] = event;
    O$.Timetable._initEvent(event);
    this._events.push(event);
  };
  this.deleteEvent = function(event) {
    if (this._events._cachedEventsByIds && event.id)
      this._events._cachedEventsByIds[event.id] = undefined;

    var eventIndex = O$.findValueInArray(event, this._events);
    this._events.splice(eventIndex, 1);
  };

  this.setEvents(events);
};

O$.WeekTable.getEventWeekday = function(weekTable, event) {
  var firstDay = weekTable._firstDay;
  var testDate = O$.cloneDate(firstDay);
  var eventDate = O$.dateByTimeMillis(event.start.getTime());

  for (var d = 0; d < 7; d++) {
    if (O$._datesEqual(eventDate, testDate)) {
      return d;
    }
    testDate = O$.incDay(testDate);
  }

  return null;
};

O$.WeekTable.getFirstDay = function(day, firstDayOfWeek) {
  var dayOfWeek = day.getDay();
  var decrement = dayOfWeek - firstDayOfWeek;
  if (decrement < 0) {
    decrement += 7;
  }
  var result = O$.incDay(day, -decrement);
  return result;
};

O$.WeekTable.isSameDay = function(firstDate, secondDate) {
  var firstPureDate = O$.cloneDate(firstDate);
  var secondPureDate = O$.cloneDate(secondDate);
  var result = (firstPureDate.getTime() == secondPureDate.getTime());
  return result;
};