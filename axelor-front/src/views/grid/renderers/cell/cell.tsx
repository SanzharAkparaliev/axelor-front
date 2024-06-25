import React, { ReactElement, useMemo } from "react";

import { Box } from "@axelor/ui";

import { Tooltip } from "@/components/tooltip";
import { useHilites } from "@/hooks/use-parser";
import { Field } from "@/services/client/meta.types";
import { legacyClassNames } from "@/styles/legacy";
import { toCamelCase } from "@/utils/names";
import { FieldDetails } from "@/views/form/builder";

import { GridCellProps } from "../../builder/types";
import * as WIDGETS from "../../widgets";

const getWidget = (name?: string) =>
  WIDGETS[toCamelCase(name ?? "") as keyof typeof WIDGETS];

export function Cell(props: GridCellProps) {
  const { view, viewContext, data, value, record } = props;
  const { type, tooltip, widget, serverType, hilites } = data as Field;
  const { children, style, className, onClick } =
    props as React.HTMLAttributes<HTMLDivElement>;

  const getHilite = useHilites(hilites);
  const $className = useMemo(
    () => getHilite({ ...viewContext, ...record })?.[0]?.css,
    [viewContext, getHilite, record],
  );
  function render() {
    function renderContent() {
      const Comp =
        getWidget(widget) || getWidget(type) || getWidget(serverType);
      if (Comp) {
        return <Comp {...props} />;
      }
      if (
        typeof value === "string" &&
        (serverType === "STRING" ||
          serverType === "TEXT" ||
          serverType === "ONE_TO_ONE" ||
          serverType === "MANY_TO_ONE")
      ) {
        return <span>{value}</span>;
      }
      return children;
    }

    return (
      <Box
        {...{
          style,
          className: legacyClassNames(className, $className),
          onClick,
        }}
      >
        {renderContent()}
      </Box>
    );
  }

  return tooltip ? (
    <Tooltip
      content={() => (
        <FieldDetails model={view?.model} data={tooltip} record={record} />
      )}
    >
      {render() as ReactElement}
    </Tooltip>
  ) : (
    render()
  );
}
