import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { readCookie } from "@/services/client/client.ts";

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

const CSRF_HEADER_NAME = "X-CSRF-Token";
const CSRF_COOKIE_NAME = "CSRF-TOKEN";

const BASE_URL = '.';

const ProductScanCapture = ({ setValue, setOpen, open }) => {
  const [cameraStarted, setCameraStarted] = useState(false);
  const html5QrCodeRef = useRef(null);
  const qrCodeRegionId = 'qr-code-region';
  const previousFocusedElementRef = useRef(null);

  const startCamera = useCallback(async () => {
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    const qrCodeSuccessCallback = async (decodedText) => {
      console.log('Decoded Text: ', decodedText);
      let product = await onSuccess(decodedText);
      setValue(!product ? null : {
        code: product?.code,
        fullName: product?.fullName,
        id: product?.id,
        version: product?.version,
      });
      handleClose();
    };

    const onSuccess = async (code) => {
      try {
        const response = await fetch(`${BASE_URL}/ws/product/barcode/${code}`, {
          credentials: 'include',
          headers: {
            [CSRF_HEADER_NAME]: readCookie(CSRF_COOKIE_NAME),
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

    const qrCodeErrorCallback = (error) => {
      console.error('QR Code Error: ', error);
    };

    const qrCodeRegion = document.getElementById(qrCodeRegionId);
    if (!qrCodeRegion) {
      console.error(`Element with id=${qrCodeRegionId} not found`);
      return;
    }

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
      setOpen(false);
    }
  }, [setValue, setOpen]);

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current && cameraStarted) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        setCameraStarted(false);
      } catch (err) {
        console.error('Camera Stop Error: ', err);
      }
    }
  }, [cameraStarted]);

  useEffect(() => {
    if (open) {
      // Save the currently focused element
      previousFocusedElementRef.current = document.activeElement;
      setTimeout(() => {
        startCamera();
      }, 100);
    } else if (cameraStarted) {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  const handleClose = useCallback(() => {
    setOpen(false);
    stopCamera();

    // Restore focus to the previously focused element
    if (previousFocusedElementRef.current) {
      previousFocusedElementRef.current.focus();
    }
  }, [setOpen, stopCamera]);

  return (
    <Modal
      open={open}
      aria-labelledby="qr-modal-title"
      aria-describedby="qr-modal-description"
    >
      <Box sx={modalStyle}>
        <Typography id="qr-modal-title" variant="h6" component="h2">
          Scan QR Code
        </Typography>
        <div id={qrCodeRegionId} style={{ width: '100%', height: '300px' }}></div>
        <Button onClick={handleClose} color="primary" sx={{ mt: 2 }}>
          Close
        </Button>
      </Box>
    </Modal>
  );
};

export default ProductScanCapture;
