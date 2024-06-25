import {CircularProgress} from "@axelor/ui";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Box, IconButton, Modal, Stack, Typography} from "@mui/material";
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import {toast} from "react-toastify";
import {readCookie} from "@/services/client/client.ts";

const CSRF_HEADER_NAME = "X-CSRF-Token";
const CSRF_COOKIE_NAME = "CSRF-TOKEN";

const BASE_URL = ".";

const modalStyles = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  border: '1px solid #000',
  boxShadow: 24,
  borderRadius: 3,
  p: 2,
};

export function FaceIDCapture({setValue, setOpen, open}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);

  const cookies = () => decodeURIComponent(document.cookie)
    .split('; ')
    .reduce((acc, cur) => {
      const [k, v] = cur.split('=');
      return {...acc, [k]: v};
    }, {});

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {facingMode: {ideal: "environment"}},
        audio: false
      });
      videoRef.current.srcObject = stream;
    } catch (error) {
      console.error("Error accessing the camera: ", error);
      toast("Ошибка доступа к камере", {type: "error"});
    }
  }, []);

  const closeCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }, []);

  useEffect(() => {
    if (open) {
      openCamera();
    } else {
      closeCamera();
    }
    return () => closeCamera();
  }, [open, openCamera, closeCamera]);

  const handleCapturePhoto = async () => {
    const context = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    context.drawImage(video, 0, 0, videoWidth, videoHeight);
    const imageData = canvasRef.current.toDataURL('image/jpeg');
    setPhoto(imageData);

    const binaryData = base64ToBinary(imageData);

    const partnerData = await handlePhotoAndFetchPartner(binaryData);

    const data = partnerData?.data?.[0];

    setValue(!data ? null : {
      fullName: data.fullName,
      id: data.id,
      $version: data.version,
      picture: data.picture
    });
  };

  const base64ToBinary = (base64: string) => {
    const base64WithoutPrefix = base64.replace("data:image/jpeg;base64,", "");
    const binaryString = atob(base64WithoutPrefix);
    const binaryLen = binaryString.length;
    const bytes = new Uint8Array(binaryLen);
    for (let i = 0; i < binaryLen; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const handlePhotoAndFetchPartner = async (binaryData: Uint8Array) => {
    setLoading(true);
    try {
      const response = await sendPhoto(binaryData);
      if (response) {
        const partnerData = await fetchPartnerData(response);
        toast("Клиент найден!", {type: "success"});
        return partnerData;
      } else {
        throw new Error("No partner data returned");
      }
    } catch (error) {
      toast("Произошла ошибка", {type: "error"});
      console.error("Error handling photo or fetching partner:", error);
    } finally {
      setLoading(false);
      closeCamera();
      handleCloseModal();
    }
  };

  const sendPhoto = async (binary: Uint8Array) => {
    const response = await fetch(BASE_URL + "/ws/face-id/check", {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'image/png',
        CSRF_HEADER_NAME: readCookie(CSRF_COOKIE_NAME),
      },
      body: binary.buffer
    });

    if (response.ok) {
      return await response.json();
    } else {
      throw new Error("Failed to send photo");
    }
  };

  const fetchPartnerData = async (partnerId: number) => {
    const response = await fetch(BASE_URL + `/ws/rest/com.axelor.apps.base.db.Partner/${partnerId}/fetch`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        CSRF_HEADER_NAME: readCookie(CSRF_COOKIE_NAME),
      },
      body: JSON.stringify({})
    });

    if (response.ok) {
      return await response.json();
    } else {
      throw new Error("Failed to fetch partner data");
    }
  };

  const handleCloseModal = () => {
    setOpen(false);
  };

  return (
    <Box>
      <Modal
        open={open}
        onClose={handleCloseModal}
      >
        <Box sx={modalStyles}>
          <Stack direction="column" gap={2} sx={{width: {xs: "320px", md: "400px"}}}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">
                Распознать клиента
              </Typography>
              <IconButton onClick={handleCloseModal}>
                <CloseOutlinedIcon/>
              </IconButton>
            </Stack>
            {open ? (
              <Stack direction="column" alignItems="center" gap={1}>
                <video ref={videoRef} autoPlay playsInline style={{
                  display: 'block', border: "1px solid #80A9F8",
                  width: "100%", height: "auto", borderRadius: 40
                }}></video>
                {loading ? <CircularProgress/> : <IconButton onClick={handleCapturePhoto}>
                  <CameraAltOutlinedIcon color="primary" fontSize="large"/>
                </IconButton>}
              </Stack>
            ) : (
              <Stack direction="column" alignItems="center" gap={1}>
                <Box component="img" sx={{
                  border: "1px solid #80A9F8",
                  borderRadius: 10,
                  objectFit: "contain",
                  width: "100%",
                }}/>
                <IconButton onClick={openCamera}>
                  <CloseOutlinedIcon color="primary" fontSize="large"/>
                </IconButton>
              </Stack>
            )}
          </Stack>
        </Box>
      </Modal>
      <canvas ref={canvasRef} style={{display: 'none'}}></canvas>
    </Box>
  );
}
