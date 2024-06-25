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
package com.axelor.tools.changelog;

import com.axelor.common.ObjectUtils;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;

public class ChangelogEntryParser {

  public ChangelogEntry parse(File file) throws IOException {
    Map<String, Object> values = loadYaml(file);
    if (ObjectUtils.isEmpty(values)) {
      throw new IllegalStateException(file + " content is empty");
    }
    return createEntry(values, file);
  }

  private Map<String, Object> loadYaml(File file) throws IOException {
    Yaml yaml = new Yaml(new SafeConstructor(new LoaderOptions()));
    try (InputStream ios = new FileInputStream(file)) {
      return yaml.load(ios);
    }
  }

  private ChangelogEntry createEntry(Map<String, Object> entries, File file) {
    ChangelogEntry changelogEntry = new ChangelogEntry();
    for (Map.Entry<String, Object> item : entries.entrySet()) {
      String value = item.getValue().toString();
      if (value == null) continue;
      if ("title".equalsIgnoreCase(item.getKey())) {
        changelogEntry.setTitle(value.trim());
      } else if ("description".equalsIgnoreCase(item.getKey())) {
        changelogEntry.setDescription(value.trim());
      } else if ("type".equalsIgnoreCase(item.getKey())) {
        changelogEntry.setType(value);
      }
    }
    changelogEntry.setPath(file.toPath());
    return changelogEntry;
  }
}
