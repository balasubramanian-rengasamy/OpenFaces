/*
 * OpenFaces - JSF Component Library 3.0
 * Copyright (C) 2007-2015, TeamDev Ltd.
 * licensing@openfaces.org
 * Unless agreed in writing the contents of this file are subject to
 * the GNU Lesser General Public License Version 2.1 (the "LGPL" License).
 * This library is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * Please visit http://openfaces.org/licensing/ for more details.
 */

package org.inspector.components;

import com.google.common.base.Joiner;
import org.apache.commons.lang3.StringUtils;
import org.inspector.css.CssWrapper;
import org.inspector.navigator.DocumentReadyCondition;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.Keys;
import org.openqa.selenium.StaleElementReferenceException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.interactions.HasInputDevices;
import org.openqa.selenium.interactions.Mouse;
import org.openqa.selenium.interactions.internal.Coordinates;
import org.openqa.selenium.internal.Locatable;
import org.openqa.selenium.support.ui.ExpectedCondition;
import org.openqa.selenium.support.ui.Wait;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.util.Collections;
import java.util.List;

import static com.google.common.collect.Lists.newArrayList;

/**
 * @author Max Yurin
 */
public class ElementWrapper {
    private WebDriver driver;
    private WebElement element;
    private By locator;

    public ElementWrapper(WebDriver webDriver, String elementId, String type) {
        this(webDriver, webDriver.findElement(By.id(elementId)), type);

        initLocator(elementId, type);
    }

    public ElementWrapper(WebDriver driver, WebElement element, String type) {
        this.driver = driver;
        this.element = element;

        checkTagNameExists(element, type);
    }

    private void initLocator(String elementId, String type) {
        final String existingElementId = id();

        if (StringUtils.isBlank(existingElementId) && StringUtils.isBlank(elementId)) {
            this.locator = findLocatorFor(type);
        } else {
            this.locator = By.id(existingElementId);
        }
    }

    private By findLocatorFor(String type) {
        return By.xpath(getFullPathFromClosestParent(this.element) + type);
    }

    protected String getFullPathFromClosestParent(WebElement element) {
        final By parentLocator = By.xpath("..");

        String id;
        WebElement el = element;
        List<String> tags = newArrayList();

        do {
            el = el.findElement(parentLocator);
            id = el.getAttribute("id");

            if (StringUtils.isBlank(id)) {
                final String tagName = el.getTagName();
                if (StringUtils.isNotBlank(tagName)) {
                    tags.add(tagName);
                }
            }
        } while (StringUtils.isBlank(id));

        Joiner join = Joiner.on("//");
        Collections.reverse(tags);

        final String splitterTags = join.join(tags) + (tags.size() >= 1 ? "//" : "");

        return String.format("//%s[@id='%s']//", el.getTagName(), id) + splitterTags;
    }

    private void checkTagNameExists(WebElement element, String type) {
        if (!element.getTagName().equalsIgnoreCase(type)) {
            throw new RuntimeException("Element should be [" + element.getTagName() + "] but was [" + type + "]");
        }
    }

    public CssWrapper css() {
        return new CssWrapper(element());
    }

    public WebDriver driver() {
        return driver;
    }

    public By locator() {
        return locator;
    }

    public WebElement element() {
        if (locator != null) {
            final Wait<WebDriver> wait = new WebDriverWait(driver(), 3).ignoring(StaleElementReferenceException.class);

            this.element = wait.until(new ExpectedCondition<WebElement>() {
                @Override
                public WebElement apply(WebDriver webDriver) {
                    final WebElement webElement = webDriver.findElement(locator);
                    return webElement != null && webElement.isDisplayed() ? webElement : null;
                }
            });
        }

        return this.element;
    }

    private ExpectedCondition<Boolean> stalenessOf(final WebElement element) {
        return new ExpectedCondition<Boolean>() {
            @Override
            public Boolean apply(WebDriver webDriver) {
                try {
                    return element.isEnabled();
                } catch (StaleElementReferenceException e) {
                    return true;
                }
            }
        };
    }

    public String id() {
        return attribute("id");
    }

    public MouseWrapper mouse() {
        return new MouseWrapper(element());
    }

    public KeyboardWrapper keyboard() {
        return new KeyboardWrapper(driver, element());
    }

    public void click() {
        mouse().click();
    }

    public void clickAndWait() {
        click();
        waitForCommandExecute();
        AjaxSupport.waitAjaxProcess(locator);
    }

    public String attribute(String name) {
        return element().getAttribute(name);
    }

    public WebElement findElement(By by) {
        try {
            return element().findElement(by);
        } catch (StaleElementReferenceException e) {
            return element().findElement(by);
        }
    }

    public List<WebElement> findElements(By by) {
        try {
            return element().findElements(by);
        } catch (StaleElementReferenceException e) {
            return element().findElements(by);
        }
    }

    protected By findById(String id) {
        return By.id(id);
    }

    public boolean isEnabled() {
        return element().isEnabled();
    }

    public boolean isDisplayed() {
        return element().isDisplayed();
    }

    public WebElement subElement(String xpath) {
        return findElement(By.xpath(".//" + xpath));
    }

    public List<WebElement> subElements(String xpath) {
        return findElements(By.xpath(".//" + xpath));
    }

    public WebElement getParent(String tagName) {
        WebElement element = element();

        if (StringUtils.isBlank(tagName)) {
            return null;
        }

        while (!element().getTagName().equalsIgnoreCase(tagName)) {
            element = element().findElement(By.xpath(".."));
        }

        return element;
    }

    protected void waitForCommandExecute() {
        final WebDriverWait wait = new WebDriverWait(driver(), 2);

        final DocumentReadyCondition condition = new DocumentReadyCondition();
        condition.apply(driver());

        wait.until(condition);
    }

    protected int parseInt(String value, int defaultValue) {
        if (StringUtils.isNumeric(value)) {
            return Integer.parseInt(value.trim());
        }

        return defaultValue;
    }

    public static class KeyboardWrapper {
        private Actions actions;
        private WebElement element;
        private WebDriver driver;

        public KeyboardWrapper(WebDriver driver, WebElement element) {
            this.element = element;
            this.actions = new Actions(driver);
        }

        public void keyPress(Keys keys) {
            actions.sendKeys(element, keys).perform();
        }

        public void keyUp(Keys controlKey, Keys key) {
            actions.keyUp(element, controlKey).sendKeys(element, key).perform();
        }

        public void keyUpWithControlPressed(Keys keys) {
            actions.keyUp(element, Keys.CONTROL).sendKeys(element, keys).perform();
        }

        public void keyUpWithAltPressed(Keys keys) {
            actions.keyUp(element, Keys.ALT).sendKeys(element, keys).perform();
        }

        public void keyUpWithShiftPressed(Keys keys) {
            actions.keyUp(element, Keys.SHIFT).sendKeys(element, keys).perform();
        }

        public void keyUpJs(Keys keys) {
            ((JavascriptExecutor) driver).executeScript(element.getAttribute("onkeyup"), element);
        }

        public void keyDown(Keys keys) {
            actions.keyDown(element, Keys.CONTROL).sendKeys(element, keys).perform();
        }
    }

    public class MouseWrapper {
        private Mouse mouse;
        private Actions actions;
        private WebElement element;

        public MouseWrapper(WebElement element) {
            this.mouse = ((HasInputDevices) driver()).getMouse();
            this.actions = new Actions(driver());
            this.element = element;
        }

        public void click() {
            this.element.click();
        }

        public void clickAndHold() {
            actions.clickAndHold(this.element).perform();
        }

        public void mouseOver() {
            mouseMove(this.element);
        }

        public void focus() {
//        mouseMove(element());
            //Workaround
//        final JavascriptExecutor executor = (JavascriptExecutor) driver();
//        executor.executeScript("var x = document.getElementById(\'" + id() + "\'); x.focus();");

            this.element.click();
        }

        public void blur() {
            final JavascriptExecutor executor = (JavascriptExecutor) driver;
            executor.executeScript("var x = document.getElementById(\'" + this.element.getAttribute("id") + "\'); x.blur();");
        }

        public void mouseMove(WebElement element) {
            this.mouse.mouseMove(getCoordinates(element));
//        this.actions.moveToElement(element).perform();
        }

        public void mouseUp() {
//        getMouse().mouseUp(getCoordinates());

            //Workaround for last selenium
            this.actions.release(this.element).perform();
        }

        public void mouseDown() {
            this.mouse.mouseDown(getCoordinates());
        }

        public void doubleClick() {
            this.mouse.doubleClick(getCoordinates());
        }

        public Coordinates getCoordinates() {
            return getCoordinates(this.element);
        }

        private Coordinates getCoordinates(WebElement element) {
            return ((Locatable) element).getCoordinates();
        }
    }
}