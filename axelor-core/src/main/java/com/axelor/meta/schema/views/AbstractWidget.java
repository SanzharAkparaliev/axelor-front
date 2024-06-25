/*
 * Axelor Business Solutions
 *
 * Copyright (C) 2005-2024 Axelor (<http://axelor.com>).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package com.axelor.meta.schema.views;

import com.axelor.db.mapper.Mapper;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonSubTypes.Type;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.annotation.JsonTypeInfo.As;
import com.fasterxml.jackson.annotation.JsonTypeInfo.Id;
import com.google.common.base.CaseFormat;
import com.google.common.collect.Maps;
import java.util.Map;
import javax.xml.bind.annotation.XmlAnyAttribute;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlTransient;
import javax.xml.bind.annotation.XmlType;
import javax.xml.namespace.QName;

@XmlType
@JsonTypeInfo(use = Id.NAME, include = As.PROPERTY, property = "type", defaultImpl = Field.class)
@JsonInclude(Include.NON_NULL)
@JsonSubTypes({
  @Type(Field.class),
  @Type(Button.class),
  @Type(Spacer.class),
  @Type(Separator.class),
  @Type(Label.class),
  @Type(Static.class),
  @Type(Help.class),
  @Type(Dashlet.class)
})
public abstract class AbstractWidget {

  @JsonIgnore
  @XmlAttribute(name = "if")
  private String conditionToCheck;

  @JsonIgnore
  @XmlAttribute(name = "if-module")
  private String moduleToCheck;

  @JsonIgnore @XmlAnyAttribute private Map<QName, String> otherAttributes;

  @XmlTransient @JsonIgnore private String model;

  public String getConditionToCheck() {
    return conditionToCheck;
  }

  public void setConditionToCheck(String conditionToCheck) {
    this.conditionToCheck = conditionToCheck;
  }

  public String getModuleToCheck() {
    return moduleToCheck;
  }

  public void setModuleToCheck(String moduleToCheck) {
    this.moduleToCheck = moduleToCheck;
  }

  public Map<QName, String> getOtherAttributes() {
    return otherAttributes;
  }

  public void setOtherAttributes(Map<QName, String> otherAttributes) {
    this.otherAttributes = otherAttributes;
  }

  public static Map<String, Object> getWidgetAttrs(Map<QName, String> otherAttributes) {
    if (otherAttributes == null || otherAttributes.isEmpty()) {
      return null;
    }
    final Map<String, Object> attrs = Maps.newHashMap();
    for (final Map.Entry<QName, String> entry : otherAttributes.entrySet()) {
      String name = entry.getKey().getLocalPart();
      final String value = entry.getValue();
      if (name.startsWith("x-") || name.startsWith("data-")) {
        name = name.replaceFirst("^(x|data)-", "");
        name = CaseFormat.LOWER_HYPHEN.to(CaseFormat.LOWER_CAMEL, name);
        attrs.put(name, value);
      }
    }
    if (attrs.containsKey("target") && !attrs.containsKey("targetName")) {
      try {
        Class<?> target = Class.forName(attrs.get("target").toString());
        String targetName = Mapper.of(target).getNameField().getName();
        attrs.put("targetName", targetName);
      } catch (Exception e) {
        // Ignore
      }
    }
    return attrs;
  }

  @XmlTransient
  public Map<String, Object> getWidgetAttrs() {
    return getWidgetAttrs(otherAttributes);
  }

  @XmlTransient
  public void setWidgetAttrs(Map<String, Object> attrs) {
    // does nothing
  }

  public String getModel() {
    return model;
  }

  public void setModel(String model) {
    this.model = model;
  }
}
