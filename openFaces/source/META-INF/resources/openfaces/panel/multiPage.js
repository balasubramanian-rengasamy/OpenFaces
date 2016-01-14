/*
 * OpenFaces - JSF Component Library 2.0
 * Copyright (C) 2007-2012, TeamDev Ltd.
 * licensing@openfaces.org
 * Unless agreed in writing the contents of this file are subject to
 * the GNU Lesser General Public License Version 2.1 (the "LGPL" License).
 * This library is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * Please visit http://openfaces.org/licensing/ for more details.
 */

O$.MultiPage = {
  _init: function(clientId, rolloverClass, containerClass, loadingMode, pageCount, selectedIndex) {
    var multiPage = O$.initComponent(clientId, null, {
      _loadingMode: loadingMode,
      _rolloverClass: rolloverClass,
      _containerClass: containerClass,

      getPageCount: function() {
        return pageCount;
      },

      getSelectedIndex: function () {
        return selectedIndex;
      },

      setSelectedIndex: function(index) {
        if (selectedIndex == index) return;
        selectedIndex = index;
        multiPage.doSetSelectedIndex(index);
      },

      _getPageContainer: function(pageIndex) {
        var result = O$(this.id + "::pane" + pageIndex);
        return result;
      },

      _changeCurrentPageContainer: function(newPageContainer) {
        var prevPageContainer = this._currentPageContainer;
        O$.MultiPage._hideContainer(prevPageContainer);

        O$.MultiPage._getContianerStyleElement(newPageContainer).className = multiPage._containerClass;

        O$.MultiPage._waitDOMContentLoaded(currentPageContainer, function(){
          O$.MultiPage._showContainer(newPageContainer);
        });

        multiPage._currentPageContainer = newPageContainer;
        O$.repaintAreaForOpera(multiPage);
      }
    });


    var currentPageContainer = multiPage._getPageContainer(selectedIndex);
    if (!currentPageContainer)
      return;
    currentPageContainer.parentNode.fontSize = "0px";
    multiPage._currentPageContainer = currentPageContainer;
    var pagesContainer = currentPageContainer.parentNode;
    multiPage._pagesContainer = pagesContainer;

    // setup methods
    O$.assignEventHandlerField(multiPage, "onmouseover", function () {
      O$.appendClassNames(this, [this._rolloverClass]);
      O$.repaintAreaForOpera(this, true);
    });
    O$.assignEventHandlerField(multiPage, "onmouseout", function () {
      O$.excludeClassNames(this, [this._rolloverClass]);
      O$.repaintAreaForOpera(this, true);
    });

    multiPage.doSetSelectedIndex = function(absoluteIndex) {
      O$.setHiddenField(multiPage, clientId + "::index", absoluteIndex);
      var loadingMode = multiPage._loadingMode;
      var newPageContainer;
      if (loadingMode == "server") {
        O$.submitEnclosingForm(multiPage);
      } else if (loadingMode == "ajaxLazy" || loadingMode == "ajaxAlways") {
        newPageContainer = multiPage._getPageContainer(absoluteIndex);
        if (!newPageContainer || loadingMode == "ajaxAlways")
          O$.Ajax.requestComponentPortions(multiPage.id, ["page:" + absoluteIndex], null, function(multiPageComponent, portionName, portionHTML, portionScripts) {
            var tempDiv = document.createElement("div");
            tempDiv.innerHTML = portionHTML;
            var newPageContainer = tempDiv.childNodes[0];
            var id = newPageContainer.id;
            var componentContainer = multiPageComponent._pagesContainer;
            for (var i = 0; i < componentContainer.childNodes.length; i++) {
              var childNode = componentContainer.childNodes[i];

              if (childNode.id == id) {
                componentContainer.removeChild(childNode);
              }
            }
            multiPageComponent._pagesContainer.appendChild(newPageContainer);
            O$.Ajax.executeScripts(portionScripts);

            O$.assert(portionName.substring(0, "page:".length) == "page:", "tabbedPanePageLoaded: illegal portion prefix:" + portionName);
            var pageNoStr = portionName.substring("page:".length);
            var pageNo = eval(pageNoStr);
            multiPageComponent._changeCurrentPageContainer(newPageContainer);
            multiPageComponent.setSelectedIndex(pageNo);
          });
        else
          multiPage._changeCurrentPageContainer(newPageContainer);
      } else if (loadingMode == "client") {
        newPageContainer = multiPage._getPageContainer(absoluteIndex);
        multiPage._changeCurrentPageContainer(newPageContainer);
      } else
        O$.assert(false, "tabSet.onchange - invalid loading mode: " + loadingMode);
    };

    // relayout pane container
    O$.MultiPage._waitDOMContentLoaded(currentPageContainer, function(){
      O$.MultiPage._showContainer(currentPageContainer);
    });
  },

  _hideContainer: function(paneContainer) {
    paneContainer.style.display = "none";
  },

  _waitDOMContentLoaded: function(pane, callback){
    var tid = setInterval(function(){
      if(document.readyState !== 'complete') {
        return;
      }
      O$.MultiPage._hideLoadingMessage(pane);
      callback();
      clearInterval(tid);
    }, 100);
  },

  _hideLoadingMessage: function(pane){
    var node = pane.querySelector(".o_sub_panel_loading");
    if (node) {
      node.parentNode.parentNode.remove();
    }
  },

  _hideAllOpenedPanes: function(currentPane){
    var attributeValue = currentPane.getAttribute('multipagecontainerid');
    var nodes = document.querySelectorAll('[multipagecontainerid="' + attributeValue + '"]');
    for (var i = 0; i < nodes.length; i++) {
      var pane = nodes[i];
      if (pane.style.display === '' || pane.style.display === 'block') {
        O$.MultiPage._hideContainer(pane);
      }
    }
  },

  _showContainer: function(paneContainer) {
    O$.MultiPage._hideAllOpenedPanes(paneContainer);

    var containers = paneContainer.getElementsByClassName("o_tabbedpane_container");
    if (containers.length > 0) {
      containers[0].style.display = 'block';
    }
    paneContainer.style.display = "block";
    paneContainer.parentNode.style.height = "100%";
    paneContainer.parentNode.style.width = "100%";
    paneContainer.style.width = "100%";
    paneContainer.style.height = "100%";
    O$.repaintAreaForOpera(paneContainer, true); // JSFC-2244
  },

  _getContianerStyleElement: function(container) {
    if (!container._styleElement)
      container._styleElement = container.getElementsByTagName("td")[0];
    return container._styleElement;
  },

  _getTargetComponentHasOwnKeyBehavior: function(evt) {
    var element = evt.target ? evt.target : evt.srcElement;
    var tagName = element ? element.tagName : null;
    if (tagName)
      tagName = tagName.toLowerCase();
    var elementHasItsOwnMouseBehavior =
            tagName == "input" ||
            tagName == "textarea";
    return  elementHasItsOwnMouseBehavior && element.className != "o_hiddenFocus";
  }
};