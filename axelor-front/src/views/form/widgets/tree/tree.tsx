import Modal from "@mui/material/Modal";
import React, {ChangeEvent, useCallback, useEffect, useState} from "react";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {readCookie} from "@/services/client/client.ts";
import {Box, TextField, Button, CircularProgress} from "@axelor/ui";
import Typography from "@mui/material/Typography";
import styles from "./tree.module.scss";

interface IDataItem {
  id: number;
  treeName: string;
  _children?: number;
}

interface IData {
  data: IDataItem[];
}


const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_COOKIE_NAME = 'CSRF-TOKEN';
const BASE_URL = '.';

const TreeNode = ({ node, onExpand }: {node: IDataItem, onExpand?: (id: number, expanded: boolean) => void}) => {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<IData | null>(null);

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
    <Box className={styles.tree}>
      <Box onClick={handleExpand} className={styles.tree_row} style={{
        backgroundColor: expanded ? "#f0f0f0" : "#fff",
        color: expanded ? "#000" : "#5A5A7C"
      }}>
        {node.treeName}
        {node._children &&
          <Typography className={styles.tree_row__title}>
            {node._children}
            {expanded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </Typography>
        }
      </Box>
      {expanded && children && (
        <Box style={{ paddingLeft: 20 }}>
          {children?.data?.map(child => (
            <TreeNode key={child.id} node={child} onExpand={onExpand} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export function Tree({openModal, setOpenModal}: {openModal: boolean, setOpenModal: (openModal: boolean) => void}) {
  const [data, setData] = useState<IData | null>(null)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const fetchItems = async () => {
    setLoading(true)
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
    }).finally(() => setLoading(false));
    if (!response.ok) throw new Error(`not found`);
    const items = await response.json();
    setData(items)
  }
  
  useEffect(() => {
    if (openModal) {
      fetchItems()
    }
  }, [openModal])

  const handleSearch = useCallback(async () => {
    setSearchLoading(true)
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
    })
      .finally(() => setSearchLoading(false));
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
      onClose={() => setOpenModal(false)}
      autoFocus={false}>
      <Box className={styles.modal} autoFocus={false}>
        <Box className={styles.content}>
          <Typography variant="h6" component="h2">
            Tree
          </Typography>

          <Box className={styles.content}>
            <Box className={styles.searchBar}>
              <Box className={styles.search}>
                <TextField
                  label="Search"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </Box>
              <Button onClick={handleSearch} variant="primary" disabled={searchLoading}>
                Search
              </Button>
            </Box>
            
            {loading ?
              <Box className={styles.loader_wrapper}>
                <div className={styles.loader}></div>
              </Box> :
              data?.data && 
              <Box className={styles.content_tree}>
                {data.data?.map(node => (
                  <TreeNode key={node.id} node={node} />
                ))}
              </Box>
            }
            
          </Box>

          <Button onClick={() => setOpenModal(false)} color="primary">
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  )
}