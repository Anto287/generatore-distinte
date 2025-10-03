import React, { useEffect, useState } from "react";
import {
  Card,
  Typography,
  Row,
  Col,
  Space,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]); 
  const [columns, setColumns] = useState([]);
  const [selectedList, setSelectedList] = useState([]);

  useEffect(() => {
    async function fetchSheet() {
      try {
        const sheetId = import.meta.env.VITE_SHEET_ID;
        const gid = import.meta.env.VITE_GID ?? "0";
        if (!sheetId) throw new Error("VITE_SHEET_ID non impostato nel file .env");

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
  }, []);

  if (loading) return <Loader />;
  if (error)
    return (
      <div style={{ padding: 16 }}>
        <Card>
          <Title level={4}>Errore</Title>
          <Text>{error}</Text>
          <div style={{ marginTop: 16 }}>
            <Text>Controlla che il foglio sia pubblico e che VITE_SHEET_ID sia impostato in .env</Text>
          </div>
        </Card>
      </div>
    );

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24} md={16}>
          <Card
            title="Seleziona giocatori"
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
