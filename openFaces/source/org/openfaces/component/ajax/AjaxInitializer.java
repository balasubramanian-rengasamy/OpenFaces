/*
 * OpenFaces - JSF Component Library 3.0
 * Copyright (C) 2007-2014, TeamDev Ltd.
 * licensing@openfaces.org
 * Unless agreed in writing the contents of this file are subject to
 * the GNU Lesser General Public License Version 2.1 (the "LGPL" License).
 * This library is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * Please visit http://openfaces.org/licensing/ for more details.
 */
package org.openfaces.component.ajax;

import org.openfaces.component.ComponentConfigurator;
import org.openfaces.component.OUIClientActionHelper;
import org.openfaces.component.OUICommand;
import org.openfaces.component.OUIObjectIterator;
import org.openfaces.component.table.AbstractTableSelection;
import org.openfaces.org.json.JSONArray;
import org.openfaces.org.json.JSONException;
import org.openfaces.org.json.JSONObject;
import org.openfaces.util.AnonymousFunction;
import org.openfaces.util.Rendering;

import javax.el.MethodExpression;
import javax.el.ValueExpression;
import javax.faces.FacesException;
import javax.faces.application.FacesMessage;
import javax.faces.component.UIComponent;
import javax.faces.component.UIData;
import javax.faces.component.behavior.ClientBehaviorContext;
import javax.faces.context.FacesContext;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * This class is only for internal usage from within the OpenFaces library. It shouldn't be used explicitly
 * by any application code.
 *
 * @author Dmitry Pikhulya
 */
public class AjaxInitializer {
    private static final String EXPRESSION_PREFIX = "#{";
    private static final String EXPRESSION_SUFFIX = "}";

    public static ThreadLocal<Boolean> BUILDING_VIEW = new ThreadLocal<Boolean>();

    public JSONArray getRenderArray(FacesContext context, UIComponent sourceComponent, Iterable<String> render) {
        JSONArray idsArray = new JSONArray();
        if (render != null)
            for (String componentId : render) {
                if (componentId.startsWith(":")) {
                    idsArray.put(componentId.substring(1));
                    continue;
                }
                UIComponent component = findComponent_cached(context, sourceComponent, componentId);
                if (component == null) {
                    idsArray.put(componentId);
                    continue;
                }

                if (component instanceof UIData) {
                    UIData uiData = (UIData) component;
                    int savedRowIndex = uiData.getRowIndex();
                    uiData.setRowIndex(-1);
                    idsArray.put(component.getClientId(context));
                    uiData.setRowIndex(savedRowIndex);
                } else if (component instanceof OUIObjectIterator) {
                    OUIObjectIterator ouiObjectIterator = (OUIObjectIterator) component;
                    String savedObjectId = ouiObjectIterator.getObjectId();
                    ouiObjectIterator.setObjectId(null);
                    idsArray.put(component.getClientId(context));
                    ouiObjectIterator.setObjectId(savedObjectId);
                } else {
                    idsArray.put(component.getClientId(context));
                }
            }
        return idsArray;
    }

    private UIComponent findComponent_cached(FacesContext context, UIComponent base, String componentId) {
        Map<String,Object> requestMap = context.getExternalContext().getRequestMap();
        String componentsByIdsKey = AjaxInitializer.class.getName() + ".componentsByIds";
        Map<String, UIComponent> componentsByIds = (Map<String, UIComponent>) requestMap.get(componentsByIdsKey);
        if (componentsByIds == null) {
            componentsByIds = new HashMap<String, UIComponent>();
            requestMap.put(componentsByIdsKey, componentsByIds);
        }

        if (componentsByIds.containsKey(componentId))
            return componentsByIds.get(componentId);

        UIComponent componentById = findComponent(context, base, componentId);
        componentsByIds.put(componentId, componentById);

        return componentById;
    }

    private UIComponent findComponent(FacesContext context, UIComponent base, String componentId) {
        if (componentId == null || componentId.equals(""))
            if (base == null)
                base = context.getViewRoot();
        if (base == null)
            return null;
        UIComponent locationBase = base;
        if (locationBase instanceof ComponentConfigurator)
            locationBase = ((ComponentConfigurator) locationBase).getConfiguredComponent();
        if (locationBase == null)
            locationBase = base;
        UIComponent component = locationBase.findComponent(componentId);
        if (component == null) {
            UIComponent root;
            root = base;
            while (root.getParent() != null) {
                root = root.getParent();
            }
            return findComponentAnywhere(root, componentId);
        }
        return component;
    }

    private UIComponent findComponentAnywhere(UIComponent root, String id) {
        if (id.equals(root.getId()))
            return root;
        List<UIComponent> children = root.getChildren();
        for (UIComponent child : children) {
            UIComponent c = findComponentAnywhere(child, id);
            if (c != null)
                return c;
        }
        return null;
    }


    public JSONObject getAjaxParams(FacesContext context, OUICommand command) {
        try {
            JSONObject result = new JSONObject();
            Iterable<String> execute = command.getExecute();
            boolean submitAjaxInvoker =
                    command instanceof ComponentConfigurator || // e.g. when using Ajax in table selection, submit table params automatically
                    (command instanceof Ajax &&
                            !((Ajax) command).isStandalone()
                            && ((Ajax) command).getSubmitInvoker());
            if (execute.iterator().hasNext() || submitAjaxInvoker) {
                result.put("execute", getExecuteParam(context, command, execute));
            }

            String onajaxstart = command.getOnajaxstart();
            if (onajaxstart != null && onajaxstart.length() != 0) {
                result.put("onajaxstart", new AnonymousFunction(onajaxstart, "event"));
            }
            String onajaxend = command.getOnajaxend();
            if (onajaxend != null && onajaxend.length() != 0) {
                result.put("onajaxend", new AnonymousFunction(onajaxend, "event"));
            }
            String onerror = command.getOnerror();
            if (onerror != null && onerror.length() != 0) {
                result.put("onerror", new AnonymousFunction(onerror, "event"));
            }
            String onsuccess = command.getOnsuccess();
            if (onsuccess != null && onsuccess.length() != 0) {
                result.put("onsuccess", new AnonymousFunction(onsuccess, "event"));
            }
            String onevent = (command instanceof Ajax) ? ((Ajax) command).getOnevent() : null;
            if (onevent != null && onevent.length() != 0) {
                result.put("onevent", new AnonymousFunction(onevent, "event"));
            }
            Integer delayObj = (Integer) command.getAttributes().get("delay");
            int delay = delayObj != null ? delayObj : 0;
            if (delay > 0) {
                result.put("delay", delay);
                result.put("delayId", getAjaxComponentParam(context, command));
            }

            MethodExpression action = !(command instanceof Ajax) ? command.getActionExpression() : null;
            if (action != null){
                addActionParameters(context, command, action, result, command);
            }

            UIComponent source = null;
            if (command instanceof AbstractTableSelection) {
                source = command.getParent();
            }
            else {
                source = command;
            }
            if (source instanceof Ajax) {
                source = source.getParent();
                if (source instanceof ComponentConfigurator)
                    source = ((ComponentConfigurator) source).getConfiguredComponent();
            }
            if (source != null) {
                result.put("_sourceId", source.getClientId(context));
                Collection<ClientBehaviorContext.Parameter> behaviorParams = Rendering.getBehaviorParameters(source);
                if (behaviorParams != null && behaviorParams.size() > 0) {
                    JSONObject params = new JSONObject();
                    for (ClientBehaviorContext.Parameter behaviorParam : behaviorParams) {
                        params.put(behaviorParam.getName(), behaviorParam.getValue());
                    }
                    result.put("params", params);
                }
            }


            ValueExpression actionListener = command instanceof Ajax
                    ? command.getValueExpression("listener")
                    : command.getValueExpression("actionListener");
            if (actionListener != null) {
                String actionListenerExpressionString = actionListener.getExpressionString();
                validateExpressionString(actionListenerExpressionString);
                result.put("listener", actionListenerExpressionString.substring(EXPRESSION_PREFIX.length(),
                        actionListenerExpressionString.length() - EXPRESSION_SUFFIX.length()));
                result.put("actionComponent", getAjaxComponentParam(context, command));
            }

            result.put("immediate", command.isImmediate());
            return result;
        } catch (JSONException e) {
            throw new RuntimeException(e);
        }
    }

    private static void validateExpressionString(String actionExpressionString) {
        if (actionExpressionString.length() < 4 ||
                !actionExpressionString.startsWith(EXPRESSION_PREFIX) || !actionExpressionString.endsWith(EXPRESSION_SUFFIX))
            throw new FacesException("Action string should be formatted as #{action}, but the following was encountered: " +
                    actionExpressionString);
    }

     public Object getExecuteParam(FacesContext context,
                                     OUICommand command,
                                     Iterable<String> execute) {
        JSONArray renderArray = getRenderArray(context, command, execute);
        if (!(command instanceof Ajax)) {
            if (command instanceof ComponentConfigurator) {
                UIComponent configuredComponent = ((ComponentConfigurator) command).getConfiguredComponent();
                if (configuredComponent != null) {
                    String configuredId = configuredComponent.getClientId(context);
                    renderArray.put(configuredId);
                }
            }
            return renderArray;
        }
        Ajax ajax = (Ajax) command;
        if (!ajax.isStandalone() && ajax.getSubmitInvoker()) {
            String invokerId = OUIClientActionHelper.getClientActionInvoker(context, ajax);
            if (context.getViewRoot().findComponent(":" + invokerId) != null) {
                // if invoker is a JSF component rather than raw HTML tag
                renderArray.put(invokerId);
            }
        }
        return renderArray;
    }

    protected Object getAjaxComponentParam(FacesContext context, OUICommand command) {
        return command.getClientId(context);
    }


    private void addActionParameters(FacesContext context, OUICommand command, MethodExpression action,
                                     JSONObject result, UIComponent actionScope) throws JSONException {
        String linkOnComposite = "cc";
        String actionString = getActionString(action);
        String beanName = actionString.split("\\.")[0];

        if (beanName.equals(linkOnComposite)){
            if (!isBeanExist(context, linkOnComposite)){
                MethodExpression parentAction = getActionFromCompositeParent(actionScope, actionString);
                if (parentAction != null) {
                    actionScope = UIComponent.getCompositeComponentParent(actionScope);
                    addActionParameters(context, command, parentAction, result, actionScope);
                } else {
                    //NOP
                }
            } else {
                String summary = "Bad bean name";
                String detail = "\'cc\' name is reserved by JSF for composite components, "
                                + "therefore using \'cc\' for bean name can broke such components.";
                context.addMessage(command.getClientId(),
                                   new FacesMessage(FacesMessage.SEVERITY_WARN, summary, detail));

                result.put("_action", actionString);
                result.put("actionComponent", command.getClientId(context));
            }

        } else {
            result.put("_action", actionString);
            result.put("actionComponent", command.getClientId(context));
        }
    }

    private String getActionString(MethodExpression action) {
        String actionExpression = action.getExpressionString();
        validateExpressionString(actionExpression);
        return actionExpression.substring(
                EXPRESSION_PREFIX.length(), actionExpression.length() - EXPRESSION_SUFFIX.length());
    }


    private boolean isBeanExist(FacesContext context, String beanName) {
        Map<String, Object> applicationMap = context.getExternalContext().getApplicationMap();
        Map<String, Object> sessionMap = context.getExternalContext().getSessionMap();
        Map<String, Object> requestMap = context.getExternalContext().getRequestMap();
        Map<String, Object> viewMap = context.getViewRoot().getViewMap();

        return applicationMap.get(beanName) != null
            || sessionMap.get(beanName) != null
            || requestMap.get(beanName) != null
            || viewMap.get(beanName) != null;
    }


    private MethodExpression getActionFromCompositeParent(UIComponent currentScope, String actionString) {
        int startIndexOfActionKey = actionString.lastIndexOf(".") + 1;
        String actionKey = actionString.substring(startIndexOfActionKey);
        UIComponent compositeParent = UIComponent.getCompositeComponentParent(currentScope);
        if (compositeParent != null) {
            return (MethodExpression) compositeParent.getAttributes().get(actionKey);
        }
        return null;
    }

}
