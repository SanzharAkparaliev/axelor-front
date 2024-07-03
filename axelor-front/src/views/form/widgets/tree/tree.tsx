import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {Collapse, List, Stack, TextField} from "@mui/material";
import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import React, {useCallback, useEffect, useMemo, useState} from "react";
import MenuItem from "@mui/material/MenuItem";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {readCookie} from "@/services/client/client.ts";

const TreeNode = ({ node, onExpand }) => {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState(null);

  const handleExpand = async () => {
    if (!expanded && !children) {
      const response = await fetch(`${BASE_URL}/ws/rest/com.axelor.apps.pndp.db.TnvedPositionCode/search`, {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: String(readCookie(CSRF_COOKIE_NAME)),
        },
        body: JSON.stringify({
          data: {
            _domain: "self.parent.id = :parentId",
            _domainContext: {
              parentId: node.id,
              _countOn: "parent",
              _id: null
            }
          },
          fields: ["id", "treeName", "parent", "code"],
          sortBy: ["id"]
        })
      });
      const data = await response.json();
      setChildren(data);
    }
    setExpanded(!expanded);
    if (onExpand) onExpand(node.id, !expanded);
  };

  return (
    <div>
      <div onClick={handleExpand}>
        {node.treeName} {expanded ? '-' : '+'}
      </div>
      {expanded && children && (
        <div style={{ paddingLeft: 20 }}>
          {children?.data?.map(child => (
            <TreeNode key={child.id} node={child} onExpand={onExpand} />
          ))}
        </div>
      )}
    </div>
  );
};

const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_COOKIE_NAME = 'CSRF-TOKEN';
const BASE_URL = '.';

export function Tree({openModal, setOpenModal}: {openModal: boolean, setOpenModal: (openModal: boolean) => void}) {
  const [data, setData] = useState([])
  const [searchTerm, setSearchTerm] = useState('');
  
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
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const fetchItems = async () => {
      const response = await fetch(`${BASE_URL}/ws/rest/com.axelor.apps.pndp.db.TnvedPositionCode/search`, {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: String(readCookie(CSRF_COOKIE_NAME)),
        },
        body: JSON.stringify({
          data: {
            _domain: "self.parent IS NULL",
            _domainContext: {
              _countOn: "parent",
              _id: null
            }
          },
          fields: ["id", "treeName", "parent", "code"],
          sortBy: ["id"]
        })
      });
      if (!response.ok) throw new Error(`not found`);
      const items = await response.json();
      setData(items)
  }
  
  useEffect(() => {
    if (openModal) {
      fetchItems()
    }
  }, [openModal])

  const handleExpand = (id, expanded) => {
    console.log(`Node ${id} is now ${expanded ? 'expanded' : 'collapsed'}`);
  };

  const handleSearch = useCallback(async () => {
    const response = await fetch(`${BASE_URL}/ws/action`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: String(readCookie(CSRF_COOKIE_NAME)),
      },
      body: JSON.stringify({
        action: "com.axelor.apps.pndp.web.TnvedPositionCodeController:findTreeByNameOrCode",
        data: {
          product: searchTerm
        },
        fields: ["id", "treeName", "parent", "code"],
        sortBy: ["id"],
        limit: null
      })
    });
    if (!response.ok) throw new Error(`not found`);
    const searchData = await response.json();
    setData(searchData);
  }, [searchTerm]);
  
  return (
    <Modal
      open={openModal}
      aria-labelledby="qr-modal-title"
      aria-describedby="qr-modal-description"
      disableAutoFocus
      autoFocus={false}>
      <Box sx={modalStyle} autoFocus={false}>
        <Typography variant="h6" component="h2">
          Tree
        </Typography>

        <Box>
          <Stack direction="row">
            <TextField
              label="Search"
              variant="outlined"
              fullWidth
              margin="normal"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <Button onClick={handleSearch}>
              Search
            </Button>
          </Stack>
          <div style={{overflow: "scroll", maxHeight: "700px"}}>
            {data?.data?.map(node => (
              <TreeNode key={node.id} node={node} onExpand={handleExpand}/>
            ))}
          </div>
        </Box>

        <Button onClick={() => setOpenModal(false)} color="primary" sx={{mt: 2}}>
          Close
        </Button>
      </Box>
    </Modal>
  )
}