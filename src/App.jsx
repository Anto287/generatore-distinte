import React, { useEffect, useState } from "react";
import {
  Card,
  Typography,
  Row,
  Col,
  Space,
  Input,
  Button,
  Modal,
} from "antd";
import Papa from "papaparse";
import Loader from "./components/Loader";
import SelectorList from "./components/SelectorList";
import PdfExporter from "./components/PdfExporter";

const { Title, Text } = Typography;

function buildCsvUrl(sheetId, gid) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]); 
  const [columns, setColumns] = useState([]);
  const [selectedList, setSelectedList] = useState([]);
  const [sheetId, setSheetId] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Controlla se esiste un sheetId salvato in localStorage all'avvio
  useEffect(() => {
    const savedSheetId = localStorage.getItem("sheetId");
    if (savedSheetId) {
      setSheetId(savedSheetId);
    } else {
      setShowPasswordModal(true);
    }
  }, []);

  // Quando sheetId cambia, carica i dati
  useEffect(() => {
    if (!sheetId) return;
    
    async function fetchSheet() {
      setLoading(true);
      setError(null);
      try {
        const gid = "0";
        const url = buildCsvUrl(sheetId, gid);
        const res = await fetch(url);
        if (!res.ok) throw new Error("Impossibile scaricare il foglio: " + res.status);
        const text = await res.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        if (parsed.errors && parsed.errors.length) console.warn("Parsing errors", parsed.errors);

        const data = parsed.data;
        setRows(data);
        const cols = parsed.meta.fields || (data[0] ? Object.keys(data[0]) : []);
        setColumns(cols);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    }
    fetchSheet();
  }, [sheetId]);

  const handlePasswordSubmit = () => {
    if (!passwordInput.trim()) {
      setError("Inserisci una password valida");
      return;
    }
    localStorage.setItem("sheetId", passwordInput.trim());
    setSheetId(passwordInput.trim());
    setShowPasswordModal(false);
    setPasswordInput("");
    setError(null);
  };

  const handleChangePassword = () => {
    setPasswordInput("");
    setError(null);
    setShowPasswordModal(true);
  };

  const handleClearPassword = () => {
    localStorage.removeItem("sheetId");
    setSheetId("");
    setRows([]);
    setColumns([]);
    setSelectedList([]);
    setPasswordInput("");
    setError(null);
    setShowPasswordModal(true);
  };

  if (loading) return <Loader />;
  
  if (error && sheetId) {
    return (
      <div style={{ padding: 16 }}>
        <Card>
          <Title level={4}>Errore</Title>
          <Text>{error}</Text>
          <div style={{ marginTop: 16 }}>
            <Text>Controlla che il foglio sia pubblico e che la password sia corretto</Text>
          </div>
          <div style={{ marginTop: 16 }}>
            <Space>
              <Button type="primary" onClick={handleChangePassword}>
                Cambia password
              </Button>
              <Button danger onClick={handleClearPassword}>
                Reset
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <Modal
        title="Password"
        open={showPasswordModal}
        onOk={handlePasswordSubmit}
        onCancel={() => {
          if (sheetId) {
            setShowPasswordModal(false);
            setPasswordInput("");
            setError(null);
          }
        }}
        okText="Conferma"
        cancelText="Annulla"
        closable={!!sheetId}
        maskClosable={!!sheetId}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>Inserisci Password:</Text>
          <Input.Password
            placeholder="Password"
            value={passwordInput}
            onChange={(e) => {
              setPasswordInput(e.target.value);
              setError(null);
            }}
            onPressEnter={handlePasswordSubmit}
          />
          {error && <Text type="danger">{error}</Text>}
        </Space>
      </Modal>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24} md={16}>
          <Card
            title="Seleziona giocatori"
            extra={
              <Space>
                <Button size="small" onClick={handleChangePassword}>
                  Cambia password
                </Button>
                <Button size="small" danger onClick={handleClearPassword}>
                  Reset
                </Button>
              </Space>
            }
            style={{ minHeight: 420 }}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              <SelectorList rows={rows} columns={columns} onListChange={setSelectedList} />
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={24} md={8}>
          <Card title="Stampa / Esporta">
            <PdfExporter list={selectedList} />
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">
                Quando clicchi Stampa il PDF con la tabella generata apparirà per il download.
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}