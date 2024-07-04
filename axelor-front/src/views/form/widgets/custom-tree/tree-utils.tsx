import React, {ChangeEvent, useCallback, useEffect, useState} from "react";
import {readCookie} from "@/services/client/client.ts";
import Modal from "@mui/material/Modal";
import {Box, Button, TextField} from "@axelor/ui";
import styles from "@/views/form/widgets/custom-tree/tree.module.scss";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";


interface IDataItem {
  id: number;
  treeName: string;
  parent?: { id: number };
  code: string;
  _children?: number;
  children: {
    id: number;
    treeName: string
  }[];
  expanded?: boolean;
  isSearch: boolean;
}

interface IData {
  data: IDataItem[];
}


const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_COOKIE_NAME = 'CSRF-TOKEN';
const BASE_URL = '.';

const TreeNode = ({ node, onExpand, onSelect, selectedNode  }: {node: Record<string, any>, onExpand?: (id: number, expanded: boolean) => void, onSelect?: (item: Record<string, any>) => void, selectedNode?: Record<string, any> | null}) => {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<IData | null>(null);

  const handleExpand = async () => {
    if (!expanded && !children && !node.isSearch) {
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

  const handleSelect = () => {
    if (node.code.length === 10 && onSelect) {
      onSelect(node);
    }
  };
  
  return (
    <Box className={styles.tree}>
      <Box onClick={handleExpand} onDoubleClick={handleSelect} className={styles.tree_row} style={{
        backgroundColor: expanded ? "#f0f0f0" : selectedNode?.id === node.id ? "#d3d3f5" : "#fff",
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

      <Box style={{ paddingLeft: 20 }}>
        {node?.isSearch ? 
          (node?.children && node.children?.map((child: Record<string, any>) => (
            <TreeNode key={child.id} node={child} onExpand={onExpand} onSelect={onSelect} selectedNode={selectedNode} />
          ))) : 
          (expanded && children && children.data?.map(child => (
            <TreeNode key={child.id} node={child} onExpand={onExpand} onSelect={onSelect} selectedNode={selectedNode} />
          )))
        }
      </Box>
    </Box>
  )
};

export function TnvedTree({openModal, setOpenModal, setValue}: {
  openModal: boolean;
  setOpenModal: (open: boolean) => void;
  setValue: any
}) {
  const [data, setData] = useState<IData | null>(null)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Record<string, any> | null>(null);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    if (!event.target.value) {
      fetchItems()
    }
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
    const transformedData = transformDataToTree(searchData.data);
    setData({ data: transformedData });
  }, [searchTerm]);

  const transformDataToTree = (items: IDataItem[]) => {
    const nodes: { [key: number]: IDataItem & { children?: IDataItem[] } } = {};
    const roots: IDataItem[] = [];

    items.forEach(item => {
      nodes[item.id] = { ...item, children: [], isSearch: true };
    });

    items.forEach(item => {
      if (item.parent && nodes[item.parent.id]) {
        nodes[item.parent.id].children?.push(nodes[item.id]);
      } else {
        roots.push(nodes[item.id]);
      }
    });

    return roots;
  };

  const handleSelect = (node: Record<string, any>) => {
    setValue(node)
    setSelectedNode(node);
    setOpenModal(false)
  };

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
                  <TreeNode key={node.id} node={node} onSelect={handleSelect} selectedNode={selectedNode} />
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