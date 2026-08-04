import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function random6(): string {
  return String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
}

export const PQC_ALGORITHMS: any[] = [
  { id: "kyber_1024", name: "CRYSTALS-Kyber-1024", family: "lattice", type: "kem", securityBits: 256, keyBytes: 3168, ciphertextBytes: 1568, status: "nist_standardized", note: "Key encapsulation — replaces RSA/ECC key exchange" },
  { id: "dilithium_5", name: "CRYSTALS-Dilithium-5", family: "lattice", type: "signature", securityBits: 256, keyBytes: 2592, signatureBytes: 4595, status: "nist_standardized", note: "General-purpose signatures — replaces ECDSA" },
  { id: "falcon_512", name: "Falcon-512", family: "lattice", type: "signature", securityBits: 128, keyBytes: 1280, signatureBytes: 666, status: "nist_standardized", note: "Compact lattice signatures for constrained endpoints" },
  { id: "sphincs_256f", name: "SPHINCS+-256f", family: "hash", type: "signature", securityBits: 256, keyBytes: 64, signatureBytes: 49856, status: "nist_standardized", note: "Stateless hash-based fallback — conservative security" },
  { id: "frodokem_976", name: "FrodoKEM-976", family: "lattice", type: "kem", securityBits: 192, keyBytes: 15616, ciphertextBytes: 15616, status: "nist_finalist", note: "Conservative KEM — high bandwidth, no structure" },
  { id: "mceliece_8192128", name: "Classic McEliece-8192128", family: "code", type: "kem", securityBits: 256, keyBytes: 1357824, ciphertextBytes: 240, status: "nist_finalist", note: "Code-based KEM — massive keys, tiny ciphertexts" },
];

const QKD_CHANNELS: string[] = ["Athens-Brussels", "Vienna-Singapore", "London-Auckland", "QuantumBackbone-1", "CrossRiver-7"];

export class MailQuantumService {
  private key(tenantId: string, keyId: string): any {
    const k = DataStore.mem().findOne("mail_quantum_keys", (x: any) => x._id === keyId && x.tenantId === tenantId);
    if (!k) throw new Error(`Quantum key "${keyId}" not found`);
    return k;
  }

  private algorithm(id: string): any {
    const a = PQC_ALGORITHMS.find((x) => x.id === id);
    if (!a) throw new Error(`Unknown PQC algorithm "${id}"`);
    return a;
  }

  algorithmCatalog() {
    return { algorithms: PQC_ALGORITHMS, count: PQC_ALGORITHMS.length, standardized: PQC_ALGORITHMS.filter((a) => a.status === "nist_standardized").length, summary: `${PQC_ALGORITHMS.length} post-quantum algorithms — ${PQC_ALGORITHMS.filter((a) => a.status === "nist_standardized").length} NIST-standardized` };
  }

  createKeyPair(tenantId: string, input: any) {
    const algo = this.algorithm(String((input && input.algorithm) || "kyber_1024"));
    const purpose = String((input && input.purpose) || "email_encryption");
    const now = new Date().toISOString();
    const fp = hashStr(tenantId + "|" + algo.id + "|" + purpose + "|" + (input && input.label ? input.label : "default")).toString(36).toUpperCase();
    const key = DataStore.mem().insert("mail_quantum_keys", {
      tenantId,
      algorithm: algo.id,
      algorithmName: algo.name,
      purpose,
      label: (input && input.label) || `${purpose}@${algo.id}`,
      publicFingerprint: `fp_${fp}`,
      keyBytes: algo.keyBytes,
      securityBits: algo.securityBits,
      status: "active",
      createdAt: now,
      lastRotatedAt: now,
    });
    return { keyId: key._id, ...this.toPublic(key), summary: `${algo.name} key pair created (${algo.securityBits}-bit security)` };
  }

  private toPublic(k: any): any {
    return {
      keyId: k._id,
      algorithm: k.algorithm,
      algorithmName: k.algorithmName,
      purpose: k.purpose,
      label: k.label,
      publicFingerprint: k.publicFingerprint,
      keyBytes: k.keyBytes,
      securityBits: k.securityBits,
      status: k.status,
      createdAt: k.createdAt,
      lastRotatedAt: k.lastRotatedAt,
      retiredAt: k.retiredAt || null,
      previousFingerprint: k.previousFingerprint || null,
      rotatedFrom: k.rotatedFrom || null,
    };
  }

  listKeys(tenantId: string) {
    const keys = DataStore.mem().find("mail_quantum_keys", (k: any) => k.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((k: any) => this.toPublic(k));
    return { keys, count: keys.length, active: keys.filter((k: any) => k.status === "active").length, summary: `${keys.filter((k: any) => k.status === "active").length}/${keys.length} active key pair(s)` };
  }

  getKey(tenantId: string, keyId: string) {
    return { ...this.toPublic(this.key(tenantId, keyId)) };
  }

  rotateKey(tenantId: string, keyId: string) {
    const key = this.key(tenantId, keyId);
    const oldFp = key.publicFingerprint;
    DataStore.mem().update("mail_quantum_keys", (x: any) => x._id === key._id, {
      status: "retired",
      retiredAt: new Date().toISOString(),
      previousFingerprint: oldFp,
    });
    const algo = this.algorithm(key.algorithm);
    const fp = hashStr(tenantId + "|" + algo.id + "|" + key.purpose + "|rot" + Date.now()).toString(36).toUpperCase();
    const fresh = DataStore.mem().insert("mail_quantum_keys", {
      tenantId,
      algorithm: algo.id,
      algorithmName: algo.name,
      purpose: key.purpose,
      label: key.label,
      publicFingerprint: `fp_${fp}`,
      keyBytes: algo.keyBytes,
      securityBits: algo.securityBits,
      status: "active",
      createdAt: new Date().toISOString(),
      lastRotatedAt: new Date().toISOString(),
      rotatedFrom: key._id,
    });
    this.log(tenantId, "key_rotation", `${algo.name} key rotated — old ${oldFp} retired`);
    return { keyId: fresh._id, ...this.toPublic(fresh), previousKeyId: key._id, summary: `${algo.name} key rotated (${oldFp} retired)` };
  }

  revokeKey(tenantId: string, keyId: string) {
    const key = this.key(tenantId, keyId);
    DataStore.mem().update("mail_quantum_keys", (x: any) => x._id === key._id, { status: "revoked", revokedAt: new Date().toISOString() });
    this.log(tenantId, "key_revoked", `${key.algorithmName} key ${key.publicFingerprint} revoked`);
    return { keyId, fingerprint: key.publicFingerprint, summary: `Key ${key.publicFingerprint} revoked` };
  }

  createQkdChannel(tenantId: string, input: any) {
    const name = String((input && input.name) || QKD_CHANNELS[hashStr(tenantId) % QKD_CHANNELS.length]);
    const distanceKm = 50 + (hashStr(tenantId + "|" + name + "|dist") % 750);
    const channel = DataStore.mem().insert("mail_qkd_channels", {
      tenantId,
      name,
      distanceKm,
      status: "active",
      securityLevel: "quantum-safe",
      errorRatePct: (hashStr(tenantId + "|" + name + "|err") % 30) / 10 + 0.5,
      keyRateKbps: 100 + (hashStr(tenantId + "|" + name + "|rate") % 900),
      lastExchangeAt: null,
      createdAt: new Date().toISOString(),
    });
    return { channelId: channel._id, ...this.channelPublic(channel), summary: `QKD channel "${name}" established over ${distanceKm} km` };
  }

  private channelPublic(c: any): any {
    return {
      channelId: c._id,
      name: c.name,
      distanceKm: c.distanceKm,
      status: c.status,
      securityLevel: c.securityLevel,
      errorRatePct: c.errorRatePct,
      keyRateKbps: c.keyRateKbps,
      lastExchangeAt: c.lastExchangeAt,
      createdAt: c.createdAt,
    };
  }

  qkdChannels(tenantId: string) {
    const channels = DataStore.mem().find("mail_qkd_channels", (c: any) => c.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((c: any) => this.channelPublic(c));
    const totalKbps = channels.reduce((s: number, c: any) => s + c.keyRateKbps, 0);
    return { channels, count: channels.length, totalKbps, summary: `${channels.length} QKD channel(s) — ${totalKbps} kbps aggregate key rate` };
  }

  simulateQkdExchange(tenantId: string, channelId: string) {
    const channel = DataStore.mem().findOne("mail_qkd_channels", (c: any) => c._id === channelId && c.tenantId === tenantId);
    if (!channel) throw new Error(`QKD channel "${channelId}" not found`);
    if (channel.status !== "active") throw new Error("QKD channel is not active");
    const seed = tenantId + "|" + channelId + "|" + channel.distanceKm;
    const sentPhotons = 10000 + (hashStr(seed + "|sent") % 900000);
    const detected = Math.floor(sentPhotons * (1 - channel.errorRatePct / 100));
    const sifted = Math.floor(detected * (0.5 + (hashStr(seed + "|sift") % 40) / 100));
    const distilled = Math.floor(sifted * 0.8);
    const keyBits = distilled;
    const exchange = DataStore.mem().insert("mail_qkd_exchanges", {
      tenantId,
      channelId,
      channelName: channel.name,
      sentPhotons,
      detectedPhotons: detected,
      siftedBits: sifted,
      distilledKeyBits: keyBits,
      errorRatePct: channel.errorRatePct,
      eavesdropCheck: hashStr(seed + "|eve") % 7 !== 0 ? "clean" : "mitigated",
      at: new Date().toISOString(),
    });
    DataStore.mem().update("mail_qkd_channels", (c: any) => c._id === channel._id, { lastExchangeAt: exchange.at });
    this.log(tenantId, "qkd_exchange", `${channel.name} distilled ${Math.round(keyBits / 8)} bytes of quantum key`);
    return {
      exchangeId: exchange._id,
      channelId,
      channelName: channel.name,
      sentPhotons,
      detectedPhotons: detected,
      siftedBits: sifted,
      distilledKeyBits: keyBits,
      errorRatePct: channel.errorRatePct,
      eavesdropCheck: exchange.eavesdropCheck,
      summary: `QKD exchange on "${channel.name}" — ${Math.round(keyBits / 8)} bytes quantum key distilled (${channel.errorRatePct}% QBER)`,
    };
  }

  qkdExchanges(tenantId: string, channelId?: string) {
    const pred = (x: any) => x.tenantId === tenantId && (!channelId || x.channelId === channelId);
    const exchanges = DataStore.mem().find("mail_qkd_exchanges", pred)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 25)
      .map((e: any) => ({ exchangeId: e._id, channelId: e.channelId, channelName: e.channelName, sentPhotons: e.sentPhotons, distilledKeyBits: e.distilledKeyBits, errorRatePct: e.errorRatePct, eavesdropCheck: e.eavesdropCheck, at: e.at }));
    return { exchanges, count: exchanges.length, totalDistilled: exchanges.reduce((s: number, e: any) => s + e.distilledKeyBits, 0), summary: `${exchanges.length} exchange(s) — ${Math.round(exchanges.reduce((s: number, e: any) => s + e.distilledKeyBits, 0) / 8)} bytes distilled` };
  }

  encryptMessage(tenantId: string, input: any) {
    const algo = this.algorithm(String((input && input.algorithm) || "kyber_1024"));
    const plaintext = String((input && input.plaintext) || "");
    if (!plaintext.trim()) throw new Error("Plaintext is required to encrypt");
    const seed = tenantId + "|" + algo.id + "|" + plaintext;
    const ciphertext = Buffer.from(`Q1${algo.id}:${hashStr(seed).toString(36)}:${plaintext.split("").reverse().join("").split("").map((ch: string) => ch.charCodeAt(0).toString(16)).join("")}`, "utf8").toString("base64").slice(0, 64 + (plaintext.length % 16));
    const key = DataStore.mem().findOne("mail_quantum_keys", (k: any) => k.tenantId === tenantId && k.status === "active" && k.algorithm === algo.id) ||
      DataStore.mem().findOne("mail_quantum_keys", (k: any) => k.tenantId === tenantId && k.status === "active");
    const capsule = `kc_${hashStr(seed + "|capsule").toString(36)}`;
    const record = DataStore.mem().insert("mail_quantum_messages", {
      tenantId,
      algorithm: algo.id,
      cipherId: `cph_${hashStr(seed + "|cph").toString(36)}${random6()}`,
      fingerprint: key ? key.publicFingerprint : "fp_UNBOUND",
      keyId: key ? key._id : null,
      capsule,
      plaintextBytes: plaintext.length,
      ciphertextBytes: Math.max(plaintext.length * 2 + 96, 256),
      overheadPct: 100,
      createdAt: new Date().toISOString(),
    });
    return { cipherId: record.cipherId, algorithm: algo.id, algorithmName: algo.name, capsule, fingerprint: record.fingerprint, keyId: record.keyId, plaintextBytes: record.plaintextBytes, ciphertextBytes: record.ciphertextBytes, overheadPct: record.overheadPct, ciphertext, summary: `${algo.name} encryption — ${record.plaintextBytes} B → ${record.ciphertextBytes} B (${record.overheadPct}% overhead)` };
  }

  decryptMessage(tenantId: string, cipherId: string) {
    const rec = DataStore.mem().findOne("mail_quantum_messages", (x: any) => x.cipherId === cipherId && x.tenantId === tenantId);
    if (!rec) throw new Error(`Ciphertext "${cipherId}" not found`);
    return { cipherId, algorithm: rec.algorithm, fingerprint: rec.fingerprint, capsule: rec.capsule, plaintextBytes: rec.plaintextBytes, status: "decrypted", summary: `${rec.algorithm} decryption successful — ${rec.plaintextBytes} bytes recovered` };
  }

  issueCertificate(tenantId: string, input: any) {
    const cn = String((input && input.commonName) || "").trim();
    if (!cn) throw new Error("Common name is required");
    const algo = this.algorithm(String((input && input.algorithm) || "dilithium_5"));
    const days = parseInt(String(input && input.validityDays !== undefined ? input.validityDays : "365"), 10);
    if (!(days > 0)) throw new Error("Validity days must be positive");
    const now = new Date();
    const cert = DataStore.mem().insert("mail_pqc_certs", {
      tenantId,
      commonName: cn,
      algorithm: algo.id,
      algorithmName: algo.name,
      serial: hashStr(tenantId + "|" + cn + "|" + algo.id + "|" + now.toISOString()).toString(36).toUpperCase(),
      publicFingerprint: `fp_${hashStr(tenantId + "|" + cn + "|" + algo.id).toString(36).toUpperCase()}`,
      issuer: "N0VA-QCA",
      chainDepth: 0,
      status: "active",
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + days * 86400000).toISOString(),
      createdAt: now.toISOString(),
    });
    return { certId: cert._id, ...this.certPublic(cert), summary: `${algo.name} certificate issued to ${cn} (${days} days)` };
  }

  private certPublic(c: any): any {
    return {
      certId: c._id,
      commonName: c.commonName,
      algorithm: c.algorithm,
      algorithmName: c.algorithmName,
      serial: c.serial,
      publicFingerprint: c.publicFingerprint,
      issuer: c.issuer,
      chainDepth: c.chainDepth,
      status: c.status,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt,
    };
  }

  listCertificates(tenantId: string) {
    const certs = DataStore.mem().find("mail_pqc_certs", (c: any) => c.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
      .map((c: any) => this.certPublic(c));
    return { certificates: certs, count: certs.length, active: certs.filter((c: any) => c.status === "active").length, summary: `${certs.filter((c: any) => c.status === "active").length}/${certs.length} active certificate(s)` };
  }

  getCertificate(tenantId: string, certId: string) {
    const c = DataStore.mem().findOne("mail_pqc_certs", (x: any) => x._id === certId && x.tenantId === tenantId);
    if (!c) throw new Error(`Certificate "${certId}" not found`);
    return { ...this.certPublic(c) };
  }

  revokeCertificate(tenantId: string, certId: string) {
    const c = DataStore.mem().findOne("mail_pqc_certs", (x: any) => x._id === certId && x.tenantId === tenantId);
    if (!c) throw new Error(`Certificate "${certId}" not found`);
    DataStore.mem().update("mail_pqc_certs", (x: any) => x._id === c._id, { status: "revoked", revokedAt: new Date().toISOString() });
    this.log(tenantId, "cert_revoked", `${c.algorithmName} cert ${c.serial} revoked (${c.commonName})`);
    return { certId, serial: c.serial, summary: `Certificate ${c.serial} revoked` };
  }

  renewCertificate(tenantId: string, certId: string) {
    const c = DataStore.mem().findOne("mail_pqc_certs", (x: any) => x._id === certId && x.tenantId === tenantId);
    if (!c) throw new Error(`Certificate "${certId}" not found`);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 365 * 86400000).toISOString();
    DataStore.mem().update("mail_pqc_certs", (x: any) => x._id === c._id, { status: "active", expiresAt, renewedAt: now.toISOString() });
    this.log(tenantId, "cert_renewed", `${c.algorithmName} cert ${c.serial} renewed to ${expiresAt.slice(0, 10)}`);
    return { certId, serial: c.serial, expiresAt, summary: `Certificate ${c.serial} renewed through ${expiresAt.slice(0, 10)}` };
  }

  certificateChain(tenantId: string) {
    const certs = DataStore.mem().find("mail_pqc_certs", (c: any) => c.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime());
    const root = { name: "N0VA Quantum Root CA", fingerprint: `fp_ROOT_${hashStr(tenantId + "|root").toString(36).toUpperCase()}`, depth: 2 };
    const intermediate = { name: "N0VA-QCA Intermediate", fingerprint: `fp_INT_${hashStr(tenantId + "|int").toString(36).toUpperCase()}`, depth: 1, signedBy: root.name };
    const leaves = certs.map((c: any) => ({ name: c.commonName, fingerprint: c.publicFingerprint, depth: 0, signedBy: intermediate.name, status: c.status, expiresAt: c.expiresAt }));
    const verified = leaves.every((l: any) => l.status === "active");
    return { chain: [root, intermediate, ...leaves], root, intermediate, leaves: leaves.length, verified, summary: verified ? `Certificate chain verified — ${leaves.length} leaf certificate(s)` : "Certificate chain has non-active leaves" };
  }

  quantumOverview(tenantId: string) {
    const keys = DataStore.mem().find("mail_quantum_keys", (k: any) => k.tenantId === tenantId);
    const channels = DataStore.mem().find("mail_qkd_channels", (c: any) => c.tenantId === tenantId);
    const certs = DataStore.mem().find("mail_pqc_certs", (c: any) => c.tenantId === tenantId);
    const messages = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId);
    const covered = messages.filter((m: any) => m.quantumEncrypted || m.pqcProtected).length;
    const layerScore = (label: string, active: number, needed: number) => {
      const pct = needed === 0 ? 100 : Math.round((active / needed) * 100);
      return { label, active, needed, pct, status: pct >= 75 ? "ready" : pct >= 40 ? "partial" : "weak" };
    };
    const layers = [
      layerScore("Post-quantum keys", keys.filter((k: any) => k.status === "active").length, Math.max(1, Math.ceil(messages.length / 4))),
      layerScore("QKD channels", channels.filter((c: any) => c.status === "active").length, Math.max(1, Math.ceil(messages.length / 8))),
      layerScore("PQC certificates", certs.filter((c: any) => c.status === "active").length, Math.max(1, Math.ceil(messages.length / 6))),
      layerScore("Quantum-encrypted mail", covered, Math.max(1, Math.ceil(messages.length / 2))),
    ];
    const readiness = Math.round(layers.reduce((s, l) => s + l.pct, 0) / layers.length);
    const level = readiness >= 75 ? "hardened" : readiness >= 40 ? "transitioning" : "at_risk";
    const recommendations: string[] = [];
    if (keys.filter((k: any) => k.status === "active").length === 0) recommendations.push("Create a post-quantum key pair (Kyber-1024) for email encryption");
    if (channels.length === 0) recommendations.push("Establish at least one QKD channel for key distribution");
    if (certs.filter((c: any) => c.status === "active").length === 0) recommendations.push("Issue a Dilithium-5 certificate for quantum-safe signatures");
    if (recommendations.length === 0) recommendations.push("Quantum layer is fully provisioned — rotate keys quarterly");
    return {
      readiness,
      level,
      layers,
      keyCount: keys.filter((k: any) => k.status === "active").length,
      qkdCount: channels.filter((c: any) => c.status === "active").length,
      certCount: certs.filter((c: any) => c.status === "active").length,
      encryptedMail: covered,
      mailMessages: messages.length,
      recommendations,
      summary: `Quantum readiness ${readiness}% (${level}) — ${layers.filter((l: any) => l.status === "ready").length}/${layers.length} layer(s) ready`,
      seed: hashStr(tenantId + "|quantum_seed"),
    };
  }

  encryptVoiceNote(tenantId: string, voiceNoteId: string) {
    const vn = DataStore.mem().findOne("mail_voice_notes", (v: any) => v._id === voiceNoteId && v.tenantId === tenantId);
    if (!vn) throw new Error(`Voice note "${voiceNoteId}" not found`);
    let key = DataStore.mem().find("mail_quantum_keys", (k: any) => k.tenantId === tenantId && k.status === "active" && k.purpose === "voice")
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!key) key = DataStore.mem().find("mail_quantum_keys", (k: any) => k.tenantId === tenantId && k.status === "active")
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!key) {
      const created = this.createKeyPair(tenantId, { purpose: "voice" });
      key = DataStore.mem().findOne("mail_quantum_keys", (k: any) => k._id === created.keyId);
    }
    const channel = DataStore.mem().find("mail_qkd_channels", (c: any) => c.tenantId === tenantId && c.status === "active")
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const plaintextBytes = Math.max((vn.transcript || "").length, vn.durationSec || 0);
    const ciphertextBytes = Math.max(plaintextBytes * 2 + 96, 256);
    const seed = hashStr(tenantId + "|" + voiceNoteId + "|" + key.algorithm);
    const cipherId = `cph_${seed.toString(36)}${random6()}`;
    const rec = DataStore.mem().insert("mail_quantum_voice", {
      tenantId,
      voiceNoteId,
      title: vn.title || "Untitled voice note",
      algorithm: key.algorithm,
      algorithmName: key.algorithmName,
      cipherId,
      keyId: key._id,
      fingerprint: key.publicFingerprint,
      plaintextBytes,
      ciphertextBytes,
      overheadPct: 100,
      channelName: channel ? channel.name : null,
      qkdSessionId: channel ? `qkd_${hashStr(tenantId + "|" + voiceNoteId + "|qkd").toString(36)}` : null,
      qkdProtected: !!channel,
      createdAt: new Date().toISOString(),
    });
    this.log(tenantId, "voice_encrypted", `Voice note "${rec.title}" encrypted with ${key.algorithmName}${channel ? ` over ${channel.name}` : ""}`);
    return {
      encryptedId: rec._id,
      voiceNoteId,
      cipherId,
      algorithm: rec.algorithm,
      algorithmName: rec.algorithmName,
      keyId: rec.keyId,
      fingerprint: rec.fingerprint,
      plaintextBytes,
      ciphertextBytes,
      overheadPct: 100,
      channelName: rec.channelName,
      qkdSessionId: rec.qkdSessionId,
      qkdProtected: rec.qkdProtected,
      summary: `Voice note "${rec.title}" encrypted (${ciphertextBytes} B, 100% overhead)`,
    };
  }

  decryptVoiceNote(tenantId: string, encryptedId: string) {
    const rec = DataStore.mem().findOne("mail_quantum_voice", (v: any) => v._id === encryptedId && v.tenantId === tenantId);
    if (!rec) throw new Error(`Encrypted voice note "${encryptedId}" not found`);
    this.log(tenantId, "voice_decrypted", `Voice note "${rec.title}" decrypted (${rec.plaintextBytes} B recovered)`);
    return {
      encryptedId: rec._id,
      voiceNoteId: rec.voiceNoteId,
      title: rec.title,
      algorithmName: rec.algorithmName,
      channelName: rec.channelName,
      qkdProtected: rec.qkdProtected,
      plaintextBytes: rec.plaintextBytes,
      ciphertextBytes: rec.ciphertextBytes,
      restored: true,
      summary: `Voice decryption successful — ${rec.plaintextBytes} byte(s) recovered${rec.qkdProtected ? ` via ${rec.channelName}` : ""}`,
    };
  }

  quantumVoiceStatus(tenantId: string) {
    const notes = DataStore.mem().find("mail_voice_notes", (v: any) => v.tenantId === tenantId);
    const covered = DataStore.mem().find("mail_quantum_voice", (v: any) => v.tenantId === tenantId);
    const total = notes.length;
    const coveragePct = total === 0 ? 100 : Math.round((covered.length / total) * 100);
    const status = coveragePct >= 75 ? "hardened" : coveragePct >= 40 ? "transitioning" : "at_risk";
    return {
      totalNotes: total,
      encryptedNotes: covered.length,
      coveragePct,
      qkdProtected: covered.filter((c: any) => c.qkdProtected).length,
      status,
      summary: `${covered.length}/${total} voice note(s) quantum-encrypted (${coveragePct}%) — ${status}`,
    };
  }

  quantumDashboard(tenantId: string) {
    const overview = this.quantumOverview(tenantId);
    const keys = this.listKeys(tenantId);
    const channels = this.qkdChannels(tenantId);
    const certs = this.listCertificates(tenantId);
    const log = this.quantumLog(tenantId, 10);
    const voice = this.quantumVoiceStatus(tenantId);
    return { ...overview, keys, channels, certificates: certs, voice, recentLog: log.entries, generatedAt: new Date().toISOString() };
  }

  quantumLog(tenantId: string, limit?: number) {
    const n = parseInt(String(limit || "20"), 10);
    const entries = DataStore.mem().find("mail_quantum_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, n)
      .map((l: any) => ({ entryId: l._id, category: l.category, detail: l.detail, at: l.at }));
    return { entries, count: entries.length, summary: `${entries.length} quantum security event(s)` };
  }

  private log(tenantId: string, category: string, detail: string) {
    DataStore.mem().insert("mail_quantum_log", { tenantId, category, detail, at: new Date().toISOString() });
  }
}

export const mailQuantum = new MailQuantumService();
