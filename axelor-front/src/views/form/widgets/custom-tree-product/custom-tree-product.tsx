import React, { useCallback, useMemo, useState } from "react";
import { useAtom } from "jotai";
import { FieldControl, FieldProps } from "@/views/form/builder";
import { DataRecord } from "@/services/client/data.types.ts";
import { useAtomValue } from "jotai/index";
import { Select, SelectIcon } from "@/components/select";
import { MaterialIcon } from "@axelor/ui/icons/material-icon";
import { ViewerInput, ViewerLink } from "@/views/form/widgets/string/viewer.tsx";
import { TnvedTreeProduct } from "@/views/form/widgets/custom-tree-product/tree-utils-product.tsx";

// 💡 Можно также перенести эти стили в .scss файл
const truncateStyle: React.CSSProperties = {
  maxWidth: "180px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export function CustomTreeProduct(
  props: FieldProps<DataRecord> & { isSuggestBox?: boolean },
) {
  const {
    schema,
    valueAtom,
    widgetAtom,
    readonly: _readonly,
    invalid,
  } = props;

  const [value, setValue] = useAtom(valueAtom);
  const [openTree, setOpenTree] = useState(false);
  const { attrs } = useAtomValue(widgetAtom);
  const { focus, required, hidden, placeholder } = attrs as typeof attrs & { placeholder?: string };

  const readonly = _readonly;

  // Иконка для открытия дерева
  const treeIcon: SelectIcon = {
    icon: <MaterialIcon icon="query_stats" />,
    onClick: () => setOpenTree(true),
  };

  if (hidden) return null;

  return (
    <FieldControl {...props}>
      {readonly ? (
        value ? (
          <ViewerLink onClick={() => {}}>{value.name}</ViewerLink>
        ) : (
          <ViewerInput name={schema.name} value="" />
        )
      ) : (
        <div style={truncateStyle}>
          <Select
            autoFocus={focus}
            required={required}
            invalid={invalid}
            autoComplete={false}
            fetchOptions={undefined}
            value={value}
            options={value ? [value] : []}
            optionKey={(rec) => rec.id}
            optionLabel={(rec) => rec.name || `#${rec.id}`}
            optionEqual={(a, b) => a?.id === b?.id}
            placeholder={placeholder}
            onChange={(val) => {
              console.log("🧩 Выбрано из дерева:", val);
              setValue(val);
            }}
            icons={[treeIcon]}
            clearIcon={false}
            toggleIcon={false}
          />
        </div>
      )}

      <TnvedTreeProduct
        setValue={(val: DataRecord | null | undefined) => {
          if (!val) return;

          const isCategory = val.product !== undefined;
          const hasProducts = Array.isArray(val.product) && val.product.length > 0;
          const hasChildren = val._children && val._children > 0;

          if (isCategory && !hasProducts && !hasChildren) {
            console.warn("❌ Пустая категория выбрана, отменяем:", val.name);
            return;
          }

          console.log("✅ Выбран элемент:", val.name);
          setValue(val);
        }}
        setOpenModal={setOpenTree}
        openModal={openTree}
      />
    </FieldControl>
  );
}
