import React, { useCallback, useMemo, useState } from "react";
import { useAtom } from "jotai";
import {
  FieldControl,
  FieldProps,
  usePermission,
  usePrepareWidgetContext,
} from "@/views/form/builder";
import { DataContext, DataRecord } from "@/services/client/data.types.ts";
import { useAtomValue } from "jotai/index";
import {
  useBeforeSelect,
  useCompletion,
  useCreateOnTheFly,
  useEditor,
  useEditorInTab,
  useEnsureRelated,
  useSelector,
} from "@/hooks/use-relation";
import { Select, SelectIcon, SelectValue } from "@/components/select";
import { removeVersion } from "@/views/form/builder/utils.ts";
import { usePermitted } from "@/hooks/use-permitted";
import { toKebabCase } from "@/utils/names.ts";
import { useOptionLabel } from "@/views/form/widgets/many-to-one/utils.ts";
import { MaterialIcon } from "@axelor/ui/icons/material-icon";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { useFormRefresh } from "@/views/form/builder/scope.ts";
import {
  ViewerInput,
  ViewerLink,
} from "@/views/form/widgets/string/viewer.tsx";
import { TnvedTree } from "@/views/form/widgets/custom-tree/tree-utils.tsx";
import { Button } from "@axelor/ui";

export function CustomTree(
  props: FieldProps<DataRecord> & { isSuggestBox?: boolean },
) {
  const {
    schema,
    formAtom,
    valueAtom,
    widgetAtom,
    readonly: _readonly,
    invalid,
    isSuggestBox,
  } = props;

  const {
    target,
    targetName,
    targetSearch,
    canSuggest = true,
    placeholder,
    orderBy: sortBy,
    formView,
    gridView,
    limit,
    searchLimit,
    perms,
  } = schema;

  const [value, setValue] = useAtom(valueAtom);
  const [openTree, setOpenTree] = useState(false);
  const [hasSearchMore, setSearchMore] = useState(false);

  const { hasButton } = usePermission(schema, widgetAtom, perms);
  const { attrs } = useAtomValue(widgetAtom);
  const { title, focus, required, domain, hidden } = attrs;

  const getContext = usePrepareWidgetContext(schema, formAtom, widgetAtom);
  const showSelector = useSelector();
  const showEditor = useEditor();
  const showEditorInTab = useEditorInTab(schema);
  const showCreator = useCreateOnTheFly(schema);

  const search = useCompletion({
    sortBy,
    limit,
    target,
    targetName,
    targetSearch,
  });

  const handleChange = useCallback(
    (changedValue: SelectValue<DataRecord, false>) => {
      if (changedValue && changedValue.id && changedValue.id > 0) {
        const rec = removeVersion(changedValue);
        setValue(rec, true, rec.id !== value?.id);
      } else {
        setValue(changedValue, true);
      }
    },
    [setValue, value],
  );

  const canRead = perms?.read !== false;
  const canView = value && hasButton("view");
  const canEdit = value && hasButton("edit") && attrs.canEdit;
  const canNew = hasButton("new") && attrs.canNew;
  const canSelect = hasButton("select");
  const isRefLink = schema.widget === "ref-link";
  const readonly = _readonly || !canRead;

  const isPermitted = usePermitted(target, perms);

  const handleEdit = useCallback(
    async (readonly = false, record?: DataContext) => {
      const $record = record ?? value;
      if (!(await isPermitted($record, readonly))) {
        return;
      }
      if (showEditorInTab && ($record?.id ?? 0) > 0) {
        return showEditorInTab($record!, readonly);
      }
      showEditor({
        title: title ?? "",
        model: target,
        viewName: formView,
        record: $record,
        readonly,
        context: {
          _parent: getContext(),
        },
        onSelect: handleChange,
      });
    },
    [
      value,
      isPermitted,
      showEditorInTab,
      showEditor,
      title,
      target,
      formView,
      getContext,
      handleChange,
    ],
  );

  const handleView = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (isRefLink && showEditorInTab && value?.id) {
        return showEditorInTab(value, true);
      }
      return handleEdit(true);
    },
    [isRefLink, value, handleEdit, showEditorInTab],
  );

  const showCreate = useCallback(
    (input: string, popup = true) =>
      showCreator({
        input,
        popup,
        onEdit: (record) => handleEdit(false, record),
        onSelect: handleChange,
      }),
    [handleEdit, handleChange, showCreator],
  );

  const showCreateAndSelect = useCallback(
    (input: string) => showCreate(input, false),
    [showCreate],
  );

  const [beforeSelect, { onMenuOpen, onMenuClose }] = useBeforeSelect(
    schema,
    getContext,
  );

  const { ensureRelated, updateRelated, valueRef } = useEnsureRelated({
    field: schema,
    formAtom,
    valueAtom,
  });

  const showSelect = useCallback(async () => {
    const _domain = await beforeSelect(domain, true);
    const _domainContext = _domain ? getContext() : {};
    showSelector({
      model: target,
      viewName: gridView,
      orderBy: sortBy,
      multiple: false,
      domain: _domain,
      context: _domainContext,
      limit: searchLimit,
      ...(canNew && {
        onCreate: () => showCreate(""),
      }),
      onSelect: async (records) => {
        const value = await ensureRelated(records[0]);
        handleChange(value);
      },
    });
  }, [
    canNew,
    beforeSelect,
    domain,
    getContext,
    showSelector,
    showCreate,
    target,
    gridView,
    sortBy,
    searchLimit,
    ensureRelated,
    handleChange,
  ]);

  const fetchOptions = useCallback(
    async (text: string) => {
      const _domain = await beforeSelect(domain);
      const _domainContext = _domain ? getContext() : {};
      const options = {
        _domain,
        _domainContext,
      };
      if (!target) {
        return [];
      }

      const { records, page } = await search(text, options);
      setSearchMore((page.totalCount ?? 0) > records.length);
      return records;
    },
    [beforeSelect, domain, getContext, search, target],
  );

  const ensureRelatedValues = useCallback(
    async (signal?: AbortSignal, refetch?: boolean) => {
      if (value && schema.related) {
        updateRelated(value, refetch);
      }
    },
    [value, schema.related, updateRelated],
  );

  const onRefSelectRefresh = useCallback(() => {
    if (["ref-select", "ref-link"].includes(toKebabCase(schema.widget))) {
      valueRef.current = undefined;
      ensureRelatedValues(undefined, true);
    }
  }, [schema.widget, valueRef, ensureRelatedValues]);

  const getOptionKey = useCallback((rec: DataRecord) => rec.id ?? -1, []);
  const getOptionLabel = useOptionLabel(schema);
  const getOptionEqual = useCallback(
    (a: DataRecord, b: DataRecord) => a.id === b.id,
    [],
  );

  const icons: SelectIcon[] = useMemo(() => {
    const edit: SelectIcon = {
      icon: <MaterialIcon icon="edit" />,
      onClick: () => handleEdit(),
    };
    const view: SelectIcon = {
      icon: <MaterialIcon icon="description" />,
      onClick: () => handleEdit(true),
    };
    const add: SelectIcon = {
      icon: <MaterialIcon icon="add" />,
      onClick: () => handleEdit(false, { id: null }),
    };
    const tree: SelectIcon = {
      icon: <MaterialIcon icon="query_stats" />,
      onClick: () => setOpenTree(true),
    };

    const result: SelectIcon[] = [];

    if (target) {
      if (canSelect) result.push(tree);
      if (canEdit && canView) result.push(edit);
      if (isSuggestBox) return result;
      if (!canEdit && canView) result.push(view);
      if (canNew) result.push(add);
    }

    return result;
  }, [
    canEdit,
    canNew,
    canSelect,
    canView,
    handleEdit,
    isSuggestBox,
    target,
  ]);

  useAsyncEffect(ensureRelatedValues, [ensureRelatedValues]);
  useFormRefresh(onRefSelectRefresh);

  if (hidden) {
    return null;
  }

  return (
    <FieldControl {...props}>
      {readonly ? (
        value && hasButton("view") ? (
          <ViewerLink onClick={handleView}>{getOptionLabel(value)}</ViewerLink>
        ) : (
          <ViewerInput name={schema.name} value={getOptionLabel(value)} />
        )
      ) : (
        <Select
          autoFocus={focus}
          required={required}
          invalid={invalid}
          autoComplete={false}
          value={value}
          options={value ? [value] : []}
          optionKey={(rec) => rec.id ?? -1}
          optionLabel={(rec) => rec.name || rec.label || `#${rec.id}`}
          optionEqual={(a, b) => a?.id === b?.id}
          placeholder={placeholder}
          onChange={handleChange}
          onOpen={onMenuOpen}
          onClose={onMenuClose}
          icons={icons}
          clearIcon={false}
          toggleIcon={false}
          canShowNoResultOption={false}
          canCreateOnTheFly={false}
        />
      )}
      <TnvedTree
        setValue={(val: DataRecord | null | undefined) => setValue(val)}
        setOpenModal={setOpenTree}
        openModal={openTree}
      />
    </FieldControl>
  );
}
