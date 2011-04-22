/*
 * OpenFaces - JSF Component Library 2.0
 * Copyright (C) 2007-2011, TeamDev Ltd.
 * licensing@openfaces.org
 * Unless agreed in writing the contents of this file are subject to
 * the GNU Lesser General Public License Version 2.1 (the "LGPL" License).
 * This library is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * Please visit http://openfaces.org/licensing/ for more details.
 */
package org.openfaces.taglib.jsp.timetable;

import org.openfaces.taglib.internal.timetable.TimetableTag;

import javax.el.ValueExpression;

public class TimetableJspTag extends TimeScaleTableJspTag {

    public TimetableJspTag() {
        super(new TimetableTag());
    }

    public void setViewType(ValueExpression viewType) {
        getDelegate().setPropertyValue("viewType", viewType);
    }

    public void setHeaderRightStyle(ValueExpression headerRightStyle) {
        getDelegate().setPropertyValue("headerRightStyle", headerRightStyle);
    }

    public void setHeaderRightClass(ValueExpression headerRightClass) {
        getDelegate().setPropertyValue("headerRightClass", headerRightClass);
    }

    public void setOnviewchange(ValueExpression onviewchange) {
        getDelegate().setPropertyValue("onviewchange", onviewchange);
    }
}
