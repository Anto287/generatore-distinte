import React, { useMemo, useState, useEffect } from "react";
import { Select, InputNumber, Button, List, Card, Row, Col, Space, Checkbox, Radio, message } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

export default function SelectorList({ rows, columns, onListChange }) {
  const labelKey1 = "Nome";
  const labelKey2 = "Cognome";

  const CHECKBOX_KEYS = ["C", "VC", "Allen", "VAllen", "DirAcc"];
  const CHECKBOX_LABELS = {
    C: "C.",
    VC: "V.C.",
    Allen: "Allen.",
    VAllen: "V.Allen.",
    DirAcc: "Dir. Acc"
  };

  // Checkbox che rendono l'elemento "fuori numerazione"
  const SPECIAL_CHECKBOXES = ["Allen", "VAllen", "DirAcc"];

  const options = useMemo(() => rows.map((r, idx) => ({
    key: idx.toString(),
    label: `${r[labelKey1] || ""} ${r[labelKey2] || ""}`,
    raw: r
  })), [rows]);

  const [selectedKey, setSelectedKey] = useState(undefined);
  const [amount, setAmount] = useState(1);
  const [selectedCheckbox, setSelectedCheckbox] = useState(null);
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("");

  // filtraggio dropdown
  const filteredOptions = useMemo(() => options
    .filter(o => !list.find(it => it.id === o.key))
    .filter(o => o.label.toLowerCase().includes(filter.toLowerCase())),
  [options, list, filter]);

  useEffect(() => {
    if (filteredOptions.length === 0) setSelectedKey(undefined);
    else if (!filteredOptions.find(o => o.key === selectedKey)) setSelectedKey(filteredOptions[0]?.key);
  }, [filteredOptions]);

  // Calcola l'ultimo numero usato nella lista
  const lastUsedNumber = useMemo(() => {
    const numberedItems = list.filter(it => !hasSpecialCheckbox(it));
    if (numberedItems.length === 0) return 0;
    return Math.max(...numberedItems.map(it => it.amount));
  }, [list]);

  // Aggiorna amount quando cambia la selezione checkbox
  useEffect(() => {
    if (!selectedCheckbox || !SPECIAL_CHECKBOXES.includes(selectedCheckbox)) {
      setAmount(lastUsedNumber + 1);
    }
  }, [lastUsedNumber, selectedCheckbox]);

  useEffect(() => {
    if (onListChange) {
      onListChange(list);
    }
  }, [list, onListChange]);

  // Verifica se un elemento ha una checkbox speciale attiva
  function hasSpecialCheckbox(item) {
    return SPECIAL_CHECKBOXES.some(key => item[key]);
  }

  // Verifica se un numero è già usato
  function isNumberTaken(num) {
    return list.some(it => it.amount === num && !hasSpecialCheckbox(it));
  }

  // Verifica se un ruolo è già assegnato
  function isRoleTaken(role) {
    return list.some(it => it[role]);
  }

  function addSelected() {
    if (!selectedKey) return message.warn("Seleziona un elemento dalla dropdown");

    // Controlla limite massimo di 23 elementi
    if (list.length >= 23) {
      return message.error("Hai raggiunto il limite massimo di 23 giocatori");
    }

    const selectedOption = options.find(o => o.key === selectedKey);
    const isSpecial = SPECIAL_CHECKBOXES.includes(selectedCheckbox);

    // Controlla se il numero è già preso (solo per elementi numerati)
    if (!isSpecial && isNumberTaken(amount)) {
      return message.error(`Il numero ${amount} è già assegnato`);
    }

    // Controlla se il ruolo è già preso
    if (selectedCheckbox && isRoleTaken(selectedCheckbox)) {
      return message.error(`Il ruolo ${CHECKBOX_LABELS[selectedCheckbox]} è già assegnato`);
    }

    let newItem = { 
      id: selectedKey, 
      label: selectedOption.label,
      raw: selectedOption.raw,
      amount: isSpecial ? null : amount
    };

    // Inizializza tutte le checkbox a false
    CHECKBOX_KEYS.forEach(k => newItem[k] = false);
    
    // Imposta la checkbox selezionata se presente
    if (selectedCheckbox) {
      newItem[selectedCheckbox] = true;
    }

    let newList = [...list, newItem];
    newList = sortList(newList);

    setList(newList);
    setSelectedCheckbox(null);
    message.success("Elemento aggiunto");
  }

  // Gestione checkbox: una sola per riga
  function toggleCheckbox(id, key, checked) {
    // Se sto attivando una checkbox, verifico che non sia già usata
    if (checked && isRoleTaken(key)) {
      return message.error(`Il ruolo ${CHECKBOX_LABELS[key]} è già assegnato ad un'altra persona`);
    }

    setList(prev => {
      let updated = prev.map(it => ({ ...it }));
      const idx = updated.findIndex(it => it.id === id);
      if (idx === -1) return prev;

      const wasSpecial = hasSpecialCheckbox(updated[idx]);

      // Se checked, disabilita tutte le altre checkbox di questa riga
      if (checked) {
        CHECKBOX_KEYS.forEach(k => {
          updated[idx][k] = (k === key);
        });
      } else {
        updated[idx][key] = false;
      }

      const isNowSpecial = hasSpecialCheckbox(updated[idx]);

      // Se passa da speciale a non-speciale, assegna l'ultimo numero + 1
      if (wasSpecial && !isNowSpecial) {
        const numberedItems = updated.filter(it => !hasSpecialCheckbox(it) && it.id !== id);
        const maxNum = numberedItems.length > 0 ? Math.max(...numberedItems.map(it => it.amount)) : 0;
        updated[idx].amount = maxNum + 1;
      }

      // Se passa da non-speciale a speciale, rimuovi il numero
      if (!wasSpecial && isNowSpecial) {
        updated[idx].amount = null;
      }

      return sortList(updated);
    });
  }

  function sortList(items) {
    return items.sort((a, b) => {
      const aSpecial = hasSpecialCheckbox(a);
      const bSpecial = hasSpecialCheckbox(b);
      
      if (!aSpecial && !bSpecial) return a.amount - b.amount;
      if (!aSpecial && bSpecial) return -1;
      if (aSpecial && !bSpecial) return 1;
      
      const orderMap = { Allen: 1, VAllen: 2, DirAcc: 3 };
      const aOrder = SPECIAL_CHECKBOXES.find(k => a[k]) || "";
      const bOrder = SPECIAL_CHECKBOXES.find(k => b[k]) || "";
      return (orderMap[aOrder] || 999) - (orderMap[bOrder] || 999);
    });
  }

  function updateAmount(id, newAmount) {
    if (newAmount < 1) return;

    setList(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(it => it.id === id);
      if (idx === -1) return prev;

      // Non permettere cambio amount se ha checkbox speciale
      if (hasSpecialCheckbox(updated[idx])) return prev;

      // Cerca se esiste già un elemento con questo numero
      const conflictIdx = updated.findIndex(it => 
        it.amount === newAmount && 
        !hasSpecialCheckbox(it) && 
        it.id !== id
      );

      if (conflictIdx !== -1) {
        // Swap: scambia i numeri
        const oldAmount = updated[idx].amount;
        updated[idx].amount = newAmount;
        updated[conflictIdx].amount = oldAmount;
        message.info(`Scambiato numero ${newAmount} con numero ${oldAmount}`);
      } else {
        // Nessun conflitto, aggiorna normalmente
        updated[idx].amount = newAmount;
      }

      return sortList(updated);
    });
  }

  function removeItem(id) {
    setList(prev => prev.filter(it => it.id !== id));
  }

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Select
            showSearch
            placeholder="Cerca Nome/Cognome"
            value={selectedKey}
            style={{ width: "100%" }}
            onChange={v => setSelectedKey(v)}
            onSearch={v => setFilter(v)}
            filterOption={false}
          >
            {filteredOptions.map(o => <Select.Option key={o.key} value={o.key}>{o.label}</Select.Option>)}
          </Select>
          
          <Row gutter={[8, 8]} align="middle">
            <Col xs={12} sm={8}>
              <InputNumber 
                min={1} 
                value={amount} 
                onChange={v => setAmount(v ?? 1)}
                disabled={selectedCheckbox && SPECIAL_CHECKBOXES.includes(selectedCheckbox)}
                placeholder="Numero"
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={12} sm={16}>
              <Button 
                icon={<PlusOutlined />} 
                type="primary" 
                onClick={addSelected}
                block
                disabled={list.length >= 23}
              >
                Aggiungi {list.length >= 23 ? '(Max 23)' : ''}
              </Button>
            </Col>
          </Row>

          <div>
            <div style={{ marginBottom: 8, fontSize: 12, color: "#666", fontWeight: 500 }}>
              Ruolo (opzionale):
            </div>
            <Radio.Group 
              value={selectedCheckbox} 
              onChange={e => setSelectedCheckbox(e.target.value)}
              buttonStyle="solid"
              size="small"
              style={{ width: "100%" }}
            >
              <Row gutter={[8, 8]}>
                {CHECKBOX_KEYS.map(k => (
                  <Col xs={12} sm={8} md={4} key={k}>
                    <Radio.Button 
                      value={k} 
                      style={{ width: "100%", textAlign: "center" }}
                      disabled={isRoleTaken(k)}
                    >
                      {CHECKBOX_LABELS[k]}
                    </Radio.Button>
                  </Col>
                ))}
                {selectedCheckbox && (
                  <Col xs={12} sm={8} md={4}>
                    <Button 
                      size="small" 
                      onClick={() => setSelectedCheckbox(null)}
                      block
                    >
                      Nessuno
                    </Button>
                  </Col>
                )}
              </Row>
            </Radio.Group>
          </div>
        </Space>
      </Card>

      <List
        bordered
        dataSource={list}
        locale={{ emptyText: "Lista vuota" }}
        style={{ 
          maxHeight: "50vh", 
          overflowY: "auto",
          overflowX: "hidden"
        }}
        renderItem={item => {
          const isSpecial = hasSpecialCheckbox(item);
          const activeRole = CHECKBOX_KEYS.find(k => item[k]);
          
          return (
            <List.Item style={{ padding: "12px" }}>
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                {/* Riga 1: Nome e Numero */}
                <Row gutter={[8, 8]} align="middle">
                  <Col xs={14} sm={16}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{item.label}</div>
                  </Col>
                  <Col xs={10} sm={8} style={{ textAlign: "right" }}>
                    {!isSpecial ? (
                      <InputNumber 
                        min={1} 
                        defaultValue={item.amount}
                        key={`${item.id}-${item.amount}`}
                        onPressEnter={(e) => {
                          const newValue = parseInt(e.target.value);
                          if (!isNaN(newValue) && newValue !== item.amount) {
                            updateAmount(item.id, newValue);
                          }
                          e.target.blur();
                        }}
                        onBlur={(e) => {
                          const newValue = parseInt(e.target.value);
                          if (!isNaN(newValue) && newValue !== item.amount) {
                            updateAmount(item.id, newValue);
                          }
                        }}
                        style={{ width: "100%" }}
                        size="small"
                      />
                    ) : (
                      <span style={{ color: "#999", fontSize: 14 }}>Senza numero</span>
                    )}
                  </Col>
                </Row>

                {/* Riga 2: Checkbox Ruoli */}
                <Row gutter={[8, 8]}>
                  {CHECKBOX_KEYS.map(k => (
                    <Col xs={12} sm={8} md={4} key={k}>
                      <Checkbox 
                        checked={item[k]} 
                        onChange={e => toggleCheckbox(item.id, k, e.target.checked)}
                        disabled={!item[k] && isRoleTaken(k)}
                        style={{ fontSize: 12 }}
                      >
                        {CHECKBOX_LABELS[k]}
                      </Checkbox>
                    </Col>
                  ))}
                  <Col xs={12} sm={8} md={4}>
                    <Button 
                      danger 
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeItem(item.id)}
                      block
                    >
                      Rimuovi
                    </Button>
                  </Col>
                </Row>

                {/* Badge ruolo attivo (mobile) */}
                {activeRole && (
                  <div style={{ 
                    display: "inline-block",
                    padding: "2px 8px", 
                    background: "#1890ff", 
                    color: "white", 
                    borderRadius: 4, 
                    fontSize: 12,
                    fontWeight: 500
                  }}>
                    {CHECKBOX_LABELS[activeRole]}
                  </div>
                )}
              </Space>
            </List.Item>
          );
        }}
      />

      <Card size="small" style={{ marginTop: 16 }}>
        <Row gutter={[16, 8]}>
          <Col xs={24} sm={8}>
            <div style={{ fontSize: 13 }}>
              Totale: <b>{list.length}/23</b>
            </div>
          </Col>
          {list.filter(it => !hasSpecialCheckbox(it)).length > 0 && (
            <Col xs={12} sm={8}>
              <div style={{ fontSize: 13 }}>
                Numerati: <b>{list.filter(it => !hasSpecialCheckbox(it)).length}</b>
              </div>
            </Col>
          )}
          {list.filter(it => hasSpecialCheckbox(it)).length > 0 && (
            <Col xs={12} sm={8}>
              <div style={{ fontSize: 13 }}>
                Ruoli speciali: <b>{list.filter(it => hasSpecialCheckbox(it)).length}</b>
              </div>
            </Col>
          )}
        </Row>
      </Card>
    </div>
  );
}