/*
 * OpenFaces - JSF Component Library 3.0
 * Copyright (C) 2007-2012, TeamDev Ltd.
 * licensing@openfaces.org
 * Unless agreed in writing the contents of this file are subject to
 * the GNU Lesser General Public License Version 2.1 (the "LGPL" License).
 * This library is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * Please visit http://openfaces.org/licensing/ for more details.
 */
package org.openfaces.renderkit.command;


import org.openfaces.component.OUIClientActionHelper;
import org.openfaces.component.command.MenuItem;
import org.openfaces.component.command.MenuSeparator;
import org.openfaces.component.command.PopupMenu;
import org.openfaces.component.table.ColumnMenuItem;
import org.openfaces.org.json.JSONArray;
import org.openfaces.org.json.JSONObject;
import org.openfaces.renderkit.RendererBase;
import org.openfaces.util.ConvertibleToJSON;
import org.openfaces.util.Rendering;
import org.openfaces.util.Resources;
import org.openfaces.util.ScriptBuilder;
import org.openfaces.util.StyleGroup;
import org.openfaces.util.Styles;

import javax.faces.component.UIComponent;
import javax.faces.context.FacesContext;
import javax.faces.context.ResponseWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * @author Vladimir Kurganov
 */
public class PopupMenuRenderer extends RendererBase {

    private static final String DEFAULT_CLASS = "o_popup_menu";
    private static final String DEFAULT_POPUPMENU_INDENTION_CLASS = "o_popup_menu_indent";

    private static final String DEFAULT_ITEM_CLASS = "o_menu_list_item_span";
    private static final String DEFAULT_SELECTED_ITEM_CLASS = "o_menu_item_selected";
    private static final String DEFAULT_CONTENT_ITEM_CLASS = "o_menu_list_item_content";
    private static final String DEFAULT_DISABLED_ITEM = "o_menu_list_item_disabled";

    public static final String ATTR_DEFAULT_INDENT_CLASS = "_defaultIndentClass";

    private static final String MENU_ITEM_CONTENT_SUFFIX = "::content";
    private static final String MENU_ITEM_CONTROL_SUFFIX = "::control";

    @Override
    public void encodeBegin(FacesContext context, UIComponent component) throws IOException {
        if (!component.isRendered()) return;

        PopupMenu popupMenu = (PopupMenu) component;
        ResponseWriter writer = context.getResponseWriter();

        String styleClass = Styles.getCSSClass(context, popupMenu, popupMenu.getStyle(), StyleGroup.regularStyleGroup(),
                popupMenu.getStyleClass(), DEFAULT_CLASS/* + " " + DefaultStyles.getPopupMenuBackgroundColorClass()*/);

        writer.startElement("ul", popupMenu);
        writeAttribute(writer, "id", popupMenu.getClientId(context));

        Rendering.writeStandardEvents(writer, popupMenu);
        writeAttribute(writer, "class", styleClass);
    }

    @Override
    public void encodeEnd(FacesContext facesContext, UIComponent component) throws IOException {
        super.encodeEnd(facesContext, component);
        if (!component.isRendered()) return;

        PopupMenu popupMenu = (PopupMenu) component;

        ResponseWriter writer = facesContext.getResponseWriter();

        writer.endElement("ul");

        Styles.renderStyleClasses(facesContext, popupMenu);

        renderInitJS(facesContext, popupMenu);
    }


    private void renderInitJS(FacesContext context, PopupMenu popupMenu) throws IOException {
        String forId = OUIClientActionHelper.getClientActionInvoker(context, popupMenu);

        String indentClass = Styles.getCSSClass(context, popupMenu, popupMenu.getIndentStyle(), StyleGroup.regularStyleGroup(), popupMenu.getIndentClass(),
                getDefaultIndentClass(popupMenu));
        String defaultItemClass = Styles.getCSSClass(context, popupMenu, popupMenu.getItemStyle(), StyleGroup.regularStyleGroup(), popupMenu.getItemClass(),
                DEFAULT_ITEM_CLASS);
        String defaultSelectedClass = Styles.getCSSClass(context, popupMenu, popupMenu.getSelectedItemStyle(), StyleGroup.selectedStyleGroup(), popupMenu.getSelectedItemClass(),
                DEFAULT_SELECTED_ITEM_CLASS);
        String defaultContentClass = Styles.getCSSClass(context, popupMenu, popupMenu.getItemContentStyle(), StyleGroup.regularStyleGroup(), popupMenu.getItemContentClass(),
                DEFAULT_CONTENT_ITEM_CLASS);
        String defaultDisabledClass = Styles.getCSSClass(context, popupMenu, popupMenu.getDisabledItemStyle(), StyleGroup.disabledStyleGroup(1), popupMenu.getDisabledItemClass(),
                DEFAULT_DISABLED_ITEM);

        String submenuImageUrl = Resources.getURL(context, popupMenu.getSubmenuImageUrl(), "command/submenuImage.gif");
        String disabledSubmenuImageUrl = Resources.getURL(context, popupMenu.getDisabledSubmenuImageUrl(), "command/disabledSubmenuImage.gif");
        String selectedSubmenuImageUrl = Resources.getURL(context, popupMenu.getSelectedSubmenuImageUrl(), "command/submenuImage.gif");

        JSONObject eventsObj = new JSONObject();
        Rendering.addJsonParam(eventsObj, "onhide", popupMenu.getOnhide());
        Rendering.addJsonParam(eventsObj, "onshow", popupMenu.getOnshow());

        boolean isRootMenu = !(popupMenu.getParent() instanceof MenuItem);
        PopupMenu rootPopupMenu = getRootPopupMenu(popupMenu);
        String event = Rendering.getEventWithOnPrefix(context, popupMenu, "o:popupMenu");
        ScriptBuilder initScript = new ScriptBuilder();
        initScript.initScript(context, popupMenu, "O$.PopupMenu._init",
                Rendering.getRolloverClass(context, popupMenu),
                forId,
                event,
                popupMenu.isIndentVisible(),
                indentClass,
                defaultItemClass,
                defaultSelectedClass,
                defaultContentClass,
                defaultDisabledClass,

                popupMenu.getItemIconUrl(),
                popupMenu.getDisabledItemIconUrl(),
                popupMenu.getSelectedItemIconUrl(),
                popupMenu.getSelectedDisabledItemIconUrl(),

                submenuImageUrl,
                disabledSubmenuImageUrl,
                selectedSubmenuImageUrl,
                popupMenu.getSelectedDisabledSubmenuImageUrl(),

                isRootMenu,
                popupMenu.getSubmenuHorizontalOffset(),

                rootPopupMenu.getSubmenuShowDelay(),
                rootPopupMenu.getSubmenuHideDelay(),
                rootPopupMenu.isSelectDisabledItems(),

                eventsObj,
                encodeMenuItemsToJSON(context, popupMenu),
                encodeDefaultMenuItemsAttributes(context, rootPopupMenu));

        Styles.renderStyleClasses(context, popupMenu);

        Rendering.renderInitScript(context, initScript,
                Resources.utilJsURL(context),
                Resources.internalURL(context, "command/popupMenu.js"),
                Resources.internalURL(context, "command/menuItemConstructor.js"),
                Resources.internalURL(context, "popup.js"));
    }

    private String getDefaultIndentClass(PopupMenu popupMenu) {
        String defaultIndentClass = (String) popupMenu.getAttributes().get(ATTR_DEFAULT_INDENT_CLASS);
        return defaultIndentClass != null ? defaultIndentClass : DEFAULT_POPUPMENU_INDENTION_CLASS;
    }

    private PopupMenu getRootPopupMenu(PopupMenu popupMenu) {
        while (popupMenu.getParent() instanceof MenuItem) {
            popupMenu = (PopupMenu) popupMenu.getParent().getParent();
        }
        return popupMenu;

    }

    @Override
    public boolean getRendersChildren() {
        return true;
    }

    @Override
    public void encodeChildren(FacesContext context, UIComponent component) throws IOException {

    }


    public JSONArray encodeMenuItemsToJSON(FacesContext context, UIComponent component){
        JSONArray menuItems = new JSONArray();
        PopupMenu popupMenu = (PopupMenu) component;
        Map<String,Object> params = new HashMap<String, Object>();
        params.put("context", context);

        if (!popupMenu.getPreloadedItems().isEmpty()) {
            List<MenuItem> preloadedItems = popupMenu.getPreloadedItems();
            for (MenuItem preloadedItem : preloadedItems){
                try {
                    JSONObject menuItem = preloadedItem.toJSONObject(params);
                    menuItems.put(menuItem);
                } catch (Exception e){
                    e.printStackTrace();
                }
            }
            return menuItems;
        }

        List<UIComponent> components = component.getChildren();
        for (UIComponent child : components) {
            if (child instanceof MenuItem || child instanceof MenuSeparator){
                try {
                    if (child.getChildCount() > 0) {
                        PopupMenu childPopup = null;
                        List<UIComponent> children = child.getChildren();
                        List<UIComponent> componentsToRender = new ArrayList<UIComponent>();
                        for (UIComponent childElement : children) {
                            if (childElement instanceof PopupMenu) {
                                childPopup = (PopupMenu) childElement;
                            }else{
                                componentsToRender.add(childElement);
                            }
                        }
                        if (childPopup!=null){
                            JSONObject popupMenuItem = ((MenuItem)child).toJSONObject(params);
                            childPopup.encodeAll(context);
                            popupMenuItem.put("menuId", childPopup.getClientId(context));
                            menuItems.put(popupMenuItem);
                        }else {
                            JSONObject menuItem = ((MenuItem)child).toJSONObject(params);
                            encodeChildElementsWithAnchor(context, popupMenu, componentsToRender, menuItem.getString("id"));
                            menuItem.put("dynamicContent",true);
                            menuItems.put(menuItem);
                        }
                    }else {
                        Boolean addCommand = false;
                        if (child instanceof ColumnMenuItem){
                            ((ColumnMenuItem)child).setupMenuItemParams(context);
                        }else{
                            if (!(child instanceof MenuSeparator) ){
                                encodeControlElementWithAnchor(context, popupMenu, (MenuItem)child, ((MenuItem)child).getClientId());
                                addCommand = true;
                            }
                        }
                        JSONObject menuItem = ((ConvertibleToJSON)child).toJSONObject(params);
                        if (addCommand)
                            menuItem.put("addCommand",true);
                        menuItems.put(menuItem);
                    }
                } catch (Exception e){
                    e.printStackTrace();
                }
            }
        }
        return menuItems;
    }

    public void encodeControlElementWithAnchor (FacesContext context, PopupMenu popupMenu, MenuItem component, String anchorId) throws IOException {
        ResponseWriter writer = context.getResponseWriter();
        writer.startElement("div", popupMenu);
        writeAttribute(writer, "style", "display:none;");
        writeAttribute(writer, "id", anchorId + MENU_ITEM_CONTROL_SUFFIX);
        writeEventsWithAjaxSupport(context, writer, component,  getActionRequestKey(context, component));
        writer.endElement("div");
    }

    protected String getActionRequestKey(FacesContext context, UIComponent component) {
        return component.getClientId(context) + "::clicked";
    }

    public void encodeChildElementsWithAnchor(FacesContext context, UIComponent component, List<UIComponent> children, String anchorId)  throws IOException{
        ResponseWriter writer = context.getResponseWriter();
        PopupMenu popupMenu = (PopupMenu) component;
        writer.startElement("div", popupMenu);
        writeAttribute(writer, "style", "display:none;");
        writeAttribute(writer, "id", anchorId + MENU_ITEM_CONTENT_SUFFIX);
        for (UIComponent child : children){
            child.encodeAll(context);
        }
        writer.endElement("div");

    }

    public JSONObject encodeDefaultMenuItemsAttributes(FacesContext context, UIComponent component){
        JSONObject defaultAttributes = new JSONObject();

        try {
            defaultAttributes.put("DEFAULT_LIST_ITEM_CLASS", "o_menu_list_item");
            defaultAttributes.put("DEFAULT_IMG_CLASS", "o_menu_list_item_img");
            defaultAttributes.put("DEFAULT_ARROW_SPAN_CLASS", "o_menu_list_item_arrow_span");
            defaultAttributes.put("DEFAULT_INDENT_CLASS", "o_menu_list_item_image_span");
            defaultAttributes.put("DEFAULT_CONTENT_CLASS", "o_menu_list_item_content");
            defaultAttributes.put("DEFAULT_FAKE_SPAN_CLASS", "o_menu_list_item_img_fakespan");
            defaultAttributes.put("DEFAULT_LIST_SEPARATOR_CLASS", "o_menu_list_item o_menu_list_item_separator");
            defaultAttributes.put("DEFAULT_MENU_SEPARATOR_CLASS", "o_menu_separator");
        }catch (Exception e){
            e.printStackTrace();
        }
        return defaultAttributes;
    }



}


