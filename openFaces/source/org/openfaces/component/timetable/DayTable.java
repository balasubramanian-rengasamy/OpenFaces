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
package org.openfaces.component.timetable;

/**
 * @author Roman Porotnikov
 */
public class DayTable extends TimeScaleTable {
    public static final String COMPONENT_TYPE = "org.openfaces.DayTable";
    public static final String COMPONENT_FAMILY = "org.openfaces.DayTable";

    public DayTable() {
        setRendererType("org.openfaces.DayTableRenderer");
    }

    public String getFamily() {
        return COMPONENT_FAMILY;
    }

    @Override
    public Timetable.ViewType getType() {
        return Timetable.ViewType.DAY;
    }
}
