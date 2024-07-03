import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useAtom, useAtomValue } from 'jotai';
import { MaterialIcon } from '@axelor/ui/icons/material-icon';
import { Select, SelectIcon, SelectValue } from '@/components/select';
import { useAsyncEffect } from '@/hooks/use-async-effect';
import { usePermitted } from '@/hooks/use-permitted';
import {
  useBeforeSelect,
  useCompletion,
  useCreateOnTheFly,
  useEditor,
  useEditorInTab,
  useEnsureRelated,
  useSelector,
} from '@/hooks/use-relation';
import { DataContext, DataRecord } from '@/services/client/data.types';
import { toKebabCase } from '@/utils/names';
import { usePermission, usePrepareWidgetContext } from '../../builder/form';
import { FieldControl } from '@/views/form/builder';
import { useFormRefresh } from '../../builder/scope';
import { FieldProps } from '../../builder/types';
import { removeVersion } from '../../builder/utils';
import { ViewerInput, ViewerLink } from '../string/viewer';
import { useOptionLabel } from './utils';
import { readCookie } from '@/services/client/client.ts';

export function ProductScan(props: FieldProps<DataRecord> & { isSuggestBox?: boolean }) {
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
  const canView = value && hasButton('view');
  const canEdit = value && hasButton('edit') && attrs.canEdit;
  const canNew = hasButton('new') && attrs.canNew;
  const canSelect = hasButton('select');
  const isRefLink = schema.widget === 'ref-link';
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
        title: title ?? '',
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
        onCreate: () => showCreate(''),
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
      return records;
    },
    [beforeSelect, domain, getContext, search, target],
  );

  const ensureRelatedValues = useCallback(
    async () => {
      // only handle ref-select
      if (value && schema.related) {
        updateRelated(value);
      }
    },
    [value, schema.related, updateRelated],
  );

  const onRefSelectRefresh = useCallback(() => {
    if (['ref-select', 'ref-link'].includes(toKebabCase(schema.widget))) {
      valueRef.current = undefined;
      ensureRelatedValues();
    }
  }, [schema.widget, valueRef, ensureRelatedValues]);

  const getOptionKey = useCallback((option: DataRecord) => option.id!, []);
  const getOptionLabel = useOptionLabel(schema);
  const getOptionEqual = useCallback(
    (a: DataRecord, b: DataRecord) => a.id === b.id,
    [],
  );

  const getOptionMatch = useCallback(() => true, []);

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
    const find: SelectIcon = {
      icon: <MaterialIcon icon="search" />,
      onClick: showSelect,
    };
    const scan: SelectIcon = {
      icon: <MaterialIcon icon="sensor_occupied" />,
      onClick: () => setOpenFaceId(true),
    };

    const result: SelectIcon[] = [];

    if (target) {
      if (canSelect) result.push(scan);
      if (canEdit && canView) result.push(edit);
      if (isSuggestBox) return result;
      if (!canEdit && canView) result.push(view);
      if (canNew) result.push(add);
      if (canSelect) result.push(find);
    }

    return result;
  }, [
    canEdit,
    canNew,
    canSelect,
    canView,
    handleEdit,
    showSelect,
    isSuggestBox,
    target,
  ]);

  useAsyncEffect(ensureRelatedValues, []);

  // register form:refresh
  useFormRefresh(onRefSelectRefresh);

  const modalStyle = useMemo(() => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
  }), []);

  const CSRF_HEADER_NAME = 'X-CSRF-Token';
  const CSRF_COOKIE_NAME = 'CSRF-TOKEN';
  const BASE_URL = '.';

  const [openFaceId, setOpenFaceId] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const html5QrCodeRef = useRef<any>(null);
  const qrCodeRegionId = 'qr-code-region';

  const stopCamera = () => {
    if (html5QrCodeRef.current && cameraStarted) {
      try {
        setCameraStarted(false);
        html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Camera Stop Error: ', err);
      }
    }
  };
  
  const handleClose = useCallback(() => {
    stopCamera();
    setOpenFaceId(false);
  }, [setOpenFaceId]);
  
  const handleCloseButton = useCallback(async () => {
    setValue(value);
    handleClose()
  }, [setValue, value, handleClose]);
  
  const startCamera = () => {
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    const qrCodeSuccessCallback = async (decodedText: string) => {
      let product = await onSuccess(decodedText);
      setValue(!product ? null : {
        code: product?.code,
        fullName: product?.fullName,
        id: product?.id,
        version: product?.version,
      });
      handleClose();
    };

    const onSuccess = async (code: string) => {
      try {
        const response = await fetch(`${BASE_URL}/ws/product/barcode/${code}`, {
          credentials: 'include',
          headers: {
            [CSRF_HEADER_NAME]: String(readCookie(CSRF_COOKIE_NAME)),
          }
        });
        if (!response.ok) throw new Error(`Product with code "${code}" not found`);
        const data = await response.json();
        return data.data || null;
      } catch (error) {
        console.error(error);
        return null;
      }
    };

    const qrCodeErrorCallback = () => {};

    const qrCodeRegion = document.getElementById(qrCodeRegionId);
    if (!qrCodeRegion) {
      console.error(`Element with id=${qrCodeRegionId} not found`);
      return;
    }
    
    const openCamera = (async () => {
      html5QrCodeRef.current = new Html5Qrcode(qrCodeRegionId);
      try {
        await html5QrCodeRef.current.start(
          { facingMode: 'environment' },
          config,
          qrCodeSuccessCallback,
          qrCodeErrorCallback
        );
        setCameraStarted(true);
      } catch (err) {
        console.error('Camera Start Error: ', err);
        setOpenFaceId(false);
      }  
    });
    
    openCamera()
    
  };
  
  useEffect(() => {
    if (openFaceId) {
      setTimeout(() => {
        startCamera();
      }, 100);
    } else if (cameraStarted) {
      stopCamera();
    }
  }, [openFaceId, startCamera, stopCamera]);

  return (
    <FieldControl {...props}>
      {readonly &&
        (value && hasButton('view') ? (
          <ViewerLink onClick={handleView}>{getOptionLabel(value)}</ViewerLink>
        ) : (
          <ViewerInput name={schema.name} value={getOptionLabel(value)} />
        ))}
      {readonly || (
        <Select
          autoFocus={focus}
          required={required}
          invalid={invalid}
          canSelect={canSelect}
          autoComplete={canSuggest}
          fetchOptions={fetchOptions}
          options={[] as DataRecord[]}
          optionKey={getOptionKey}
          optionLabel={getOptionLabel}
          optionEqual={getOptionEqual}
          optionMatch={getOptionMatch}
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
          onOpen={onMenuOpen}
          onClose={onMenuClose}
          canCreateOnTheFly={canNew && schema.create}
          canShowNoResultOption={true}
          onShowCreate={canNew ? showCreate : undefined}
          onShowSelect={canSelect && hasSearchMore ? showSelect : undefined}
          onShowCreateAndSelect={
            canNew && schema.create ? showCreateAndSelect : undefined
          }
          icons={icons}
          clearIcon={false}
          toggleIcon={isSuggestBox ? undefined : false}
        />
      )}
      <Modal
        open={openFaceId}
        aria-labelledby="qr-modal-title"
        aria-describedby="qr-modal-description"
        disableAutoFocus
        autoFocus={false}>
        <Box sx={modalStyle} autoFocus={false}>
          <Typography tabIndex={-1} id="qr-modal-title" variant="h6" component="h2">
            Scan QR Code
          </Typography>
          <div id={qrCodeRegionId} tabIndex={-1} style={{ width: '100%', height: '300px' }}></div>
          <Button tabIndex={-1} onClick={handleCloseButton} color="primary" sx={{ mt: 2 }}>
            Close
          </Button>
        </Box>
      </Modal>
    </FieldControl>
  );
}

