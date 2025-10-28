import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { apiClient } from "../lib/api/client";
import { useAuth } from "../lib/auth/auth-context";

export default function Login() {
  // UI state
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginFeedback, setLoginFeedback] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Form refs / state
  const [empresa, setEmpresa] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [minDelay, setMinDelay] = useState(61);
  const [maxDelay, setMaxDelay] = useState(130);
  const [recipientsText, setRecipientsText] = useState("");
  const recipientsCsvRef = useRef(null);
  const fileAttachmentRef = useRef(null);
  const [progressVisible, setProgressVisible] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [progressCounter, setProgressCounter] = useState("0 / 0");
  const [stopRequested, setStopRequested] = useState(false);
  const [formFeedback, setFormFeedback] = useState("");

  const webhookUrl =
    "https://dev.n8n.sistemabrasil.online/webhook/f698985e-4f9c-4a3e-9d7c-d9b533c57cd4";

  const auth: any = useAuth();

  useEffect(() => {
    document.title = loggedIn
      ? "Disparador de Agendamento - WhatsApp"
      : "Login - Disparador de Mensagens";
  }, [loggedIn]);

  function handleLogin(e: any) {
    e.preventDefault();
    setLoginFeedback("");
    (async () => {
      try {
        const res = await auth.login(username, password);
        if (res.accessToken) {
          window.location.href = "/dashboard";
        } else {
          setLoginFeedback("Login efetuado, mas sem token recebido.");
        }
      } catch (err: any) {
        setLoginFeedback(
          err?.response?.data?.message || err.message || "Credenciais inválidas"
        );
      }
    })();
  }

  // CSV parse
  function parseCsvFile(file: File): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l);
        resolve(lines);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  function autoFillForCompany(selected: string) {
    // minimal autofill behavior for buttons and link
    setLinkUrl("");
    if (selected === "ESPETARIA FRAN") {
      setLinkUrl(
        "https://vnqvedqbnlaghdsqsieu.supabase.co/storage/v1/object/public/botimg/logofranespetaria%20(2).png"
      );
    } else if (selected === "CENTROLAR COLCHÕES ORTOBOM") {
      setLinkUrl(
        "https://vnqvedqbnlaghdsqsieu.supabase.co/storage/v1/object/public/botimg/centrolar.jpg"
      );
    } else if (selected === "LABOTÓRIO E CLÍNICA INVITA") {
      setLinkUrl(
        "https://vnqvedqbnlaghdsqsieu.supabase.co/storage/v1/object/public/botimg/invita.png"
      );
    }
  }

  async function startBatch() {
    setFormFeedback("");
    setStopRequested(false);
    // basic validation
    if (!empresa) return setFormFeedback("Por favor selecione a empresa.");
    if (!mensagem.trim())
      return setFormFeedback("Por favor digite a mensagem.");
    if (maxDelay < minDelay) return setFormFeedback("Max deve ser >= Min.");

    let recipients: string[] = [];
    const csvEl = recipientsCsvRef.current;
    if (csvEl && csvEl.files && csvEl.files.length > 0) {
      try {
        recipients = await parseCsvFile(csvEl.files[0]);
      } catch (e: any) {
        return setFormFeedback("Erro ao ler CSV.");
      }
    } else {
      recipients = recipientsText
        .split("\n")
        .map((l: string) => l.trim())
        .filter((l) => l);
    }
    if (recipients.length === 0)
      return setFormFeedback("Nenhum destinatário válido encontrado.");

    setProgressVisible(true);
    setProgressPercent(0);
    setProgressCounter(`0 / ${recipients.length}`);

    const attachmentEl = fileAttachmentRef.current;
    let anexo: any = null;
    if (attachmentEl && attachmentEl.files && attachmentEl.files[0]) {
      setProgressText("Processando anexo...");
      anexo = await fileToBase64(attachmentEl.files[0]).catch(() => null);
    }

    const basePayload: any = { empresa, mensagem };
    if (linkUrl) basePayload.link = linkUrl;
    if (anexo) basePayload.anexo = anexo;

    for (let i = 0; i < recipients.length; i++) {
      if (stopRequested) {
        setFormFeedback(`Envios interrompidos após ${i} envios.`);
        break;
      }
      const number = recipients[i];
      const current = i + 1;
      const percentage = Math.round((current / recipients.length) * 100);
      setProgressPercent(percentage);
      setProgressText(`Enviando para ${number}...`);
      setProgressCounter(`${current} / ${recipients.length}`);

      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...basePayload, number }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Falha no envio: ${res.status} ${txt}`);
        }
      } catch (err: any) {
        setFormFeedback(`Falha no envio para ${number}: ${err.message}`);
        setProgressVisible(false);
        return;
      }

      if (current < recipients.length) {
        const randomDelaySeconds =
          Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        setProgressText(
          `Pausa (${minDelay}-${maxDelay}s). Próximo em ${randomDelaySeconds}s`
        );
        await new Promise((resolve) => {
          let secondsLeft = randomDelaySeconds;
          const iv = setInterval(() => {
            secondsLeft--;
            setProgressText(
              `Pausa (${minDelay}-${maxDelay}s). Próximo em ${secondsLeft}s`
            );
            if (stopRequested || secondsLeft <= 0) {
              clearInterval(iv);
              resolve(null);
            }
          }, 1000);
        });
      }
    }

    if (!stopRequested) {
      setProgressText("Lote concluído com sucesso!");
      setTimeout(() => {
        setFormFeedback(
          `Sucesso! ${recipients.length} mensagens enfileiradas.`
        );
        setProgressVisible(false);
      }, 1500);
    }
  }

  return (
    <>
      <Head>
        <title>
          {loggedIn
            ? "Disparador de Agendamento - WhatsApp"
            : "Login - Disparador de Mensagens"}
        </title>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`body { background-color: #121212; color: #f0f0f0; font-family: 'Montserrat', sans-serif; } .login-wrapper { display: flex; justify-content: center; align-items: center; min-height: 100vh; } .login-card { background-color: #1e1e1e; border: 1px solid #333; border-radius: 12px; padding: 2.5rem; box-shadow: 0 8px 20px rgba(0,0,0,0.5);} .btn-gradient-submit { background: linear-gradient(90deg, #ff8c00 0%, #ff4500 100%); border: none; font-weight: 700; padding: 12px 30px; border-radius: 8px; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(255,140,0,0.3);} .btn-gradient-submit:hover { transform: translateY(-2px);} .form-control, .form-select { background-color: #2a2a2a; border: 1px solid #444; color: #f0f0f0; border-radius: 8px; } .form-label { color: #ccc; font-weight:600; }`}</style>
      </Head>

      <div className="container-fluid p-0">
        {!loggedIn ? (
          <div className="login-wrapper" id="loginContainer">
            <div className="col-lg-4 col-md-6 col-sm-8 col-11">
              <div className="login-card text-center">
                <img
                  src="https://i.ibb.co/L5rK5Y8/logo-placeholder.png"
                  alt="Logo"
                  className="logo"
                  style={{ maxHeight: 60, marginBottom: "1.5rem" }}
                />
                <h3 className="mb-4 text-warning">Acesso Restrito</h3>
                <form id="loginForm" onSubmit={handleLogin}>
                  <div className="form-floating mb-3">
                    <input
                      className="form-control"
                      id="username"
                      placeholder="Usuário"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    <label htmlFor="username">Usuário</label>
                  </div>
                  <div className="form-floating mb-3">
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      placeholder="Senha"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <label htmlFor="password">Senha</label>
                  </div>
                  <div className="mb-3">
                    {loginFeedback && (
                      <div className="alert alert-danger">{loginFeedback}</div>
                    )}
                  </div>
                  <div className="d-grid">
                    <button
                      className="btn btn-lg btn-gradient-submit"
                      type="submit"
                    >
                      Entrar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div id="appContainer">
            <header className="header-gradient">
              <div className="container">
                <nav className="navbar">
                  <a className="navbar-brand" href="#">
                    <img
                      src="https://vnqvedqbnlaghdsqsieu.supabase.co/storage/v1/object/public/botimg/centrolar.jpg"
                      alt="Logo da Aplicação"
                      style={{ maxHeight: 50 }}
                    />
                  </a>
                </nav>
              </div>
            </header>
            <main className="main-container py-4">
              <div className="container">
                <div className="row justify-content-center">
                  <div className="col-lg-8 col-md-10">
                    <div className="scheduler-card p-4">
                      <h2 style={{ color: "#ff8c00", fontWeight: 700 }}>
                        <i className="fas fa-paper-plane"></i> Nova Mensagem em
                        Lote
                      </h2>
                      <form
                        id="scheduleForm"
                        onSubmit={(e) => {
                          e.preventDefault();
                          startBatch();
                        }}
                      >
                        <fieldset id="mainFormFieldset">
                          <div className="mb-4">
                            <label className="form-label">
                              1. Selecione a Empresa *
                            </label>
                            <select
                              className="form-select"
                              value={empresa}
                              onChange={(e) => {
                                setEmpresa(e.target.value);
                                autoFillForCompany(e.target.value);
                              }}
                              required
                            >
                              <option value="" disabled>
                                Escolha uma empresa...
                              </option>
                              <option value="CENTROLAR COLCHÕES ORTOBOM">
                                CENTROLAR COLCHÕES ORTOBOM
                              </option>
                              <option value="LABOTÓRIO E CLÍNICA INVITA">
                                LABOTÓRIO E CLÍNICA INVITA
                              </option>
                              <option value="CENTER HOTEL">CENTER HOTEL</option>
                              <option value="ESPETARIA FRAN">
                                ESPETARIA FRAN
                              </option>
                            </select>
                          </div>
                          <div className="mb-4">
                            <label className="form-label">
                              2. Escreva sua Mensagem *
                            </label>
                            <textarea
                              className="form-control"
                              id="messageText"
                              rows={5}
                              placeholder="Digite sua mensagem aqui..."
                              value={mensagem}
                              onChange={(e) => setMensagem(e.target.value)}
                              required
                            />
                          </div>
                          <div className="mb-4">
                            <label className="form-label">
                              3. Anexar Mídia (Opcional)
                            </label>
                            <input
                              className="form-control"
                              type="file"
                              id="fileAttachment"
                              ref={fileAttachmentRef}
                            />
                          </div>
                          <div className="mb-4">
                            <label className="form-label">
                              4. Link (Opcional)
                            </label>
                            <input
                              className="form-control"
                              type="url"
                              id="linkUrl"
                              value={linkUrl}
                              onChange={(e) => setLinkUrl(e.target.value)}
                              placeholder="https://exemplo.com"
                            />
                          </div>
                          <div className="row mb-4">
                            <div className="col-md-6">
                              <label className="form-label">
                                Tempo Mínimo (s) *
                              </label>
                              <input
                                type="number"
                                className="form-control"
                                value={minDelay}
                                onChange={(e) =>
                                  setMinDelay(Number(e.target.value))
                                }
                                min={1}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">
                                Tempo Máximo (s) *
                              </label>
                              <input
                                type="number"
                                className="form-control"
                                value={maxDelay}
                                onChange={(e) =>
                                  setMaxDelay(Number(e.target.value))
                                }
                                min={1}
                              />
                            </div>
                          </div>
                          <hr />
                          <h4 className="h5">5. Adicione os Destinatários *</h4>
                          <div className="mb-3">
                            <label className="form-label">
                              Colar Números ou IDs de Grupo
                            </label>
                            <textarea
                              className="form-control"
                              id="recipientsText"
                              rows={4}
                              value={recipientsText}
                              onChange={(e) =>
                                setRecipientsText(e.target.value)
                              }
                              placeholder={"Cole um número por linha..."}
                            />
                          </div>
                          <div className="text-center my-2 fw-bold">OU</div>
                          <div className="mb-4">
                            <label className="form-label">
                              Carregar Arquivo CSV
                            </label>
                            <input
                              className="form-control"
                              type="file"
                              id="recipientsCsv"
                              accept=".csv"
                              ref={recipientsCsvRef}
                            />
                          </div>
                          <hr />
                        </fieldset>

                        {progressVisible && (
                          <div id="progressContainer" className="mt-4">
                            <div className="d-flex justify-content-between">
                              <span className="fw-bold">{progressText}</span>
                              <span className="text-warning fw-bold">
                                {progressCounter}
                              </span>
                            </div>
                            <div
                              className="progress mt-1"
                              style={{ height: 25, fontSize: "1rem" }}
                            >
                              <div
                                className={`progress-bar progress-bar-striped ${
                                  progressPercent === 100
                                    ? "bg-success"
                                    : "bg-warning"
                                }`}
                                role="progressbar"
                                style={{ width: `${progressPercent}%` }}
                                aria-valuenow={progressPercent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                {progressPercent}%
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-3">
                          {formFeedback && (
                            <div className="alert alert-info">
                              {formFeedback}
                            </div>
                          )}
                        </div>
                        <div className="form-check mt-4">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="autoClear"
                          />
                          <label className="form-check-label">
                            {" "}
                            Limpar campos de mensagem e destinatários após
                            sucesso{" "}
                          </label>
                        </div>

                        <div className="d-grid mt-4" id="submitButtonContainer">
                          <button
                            type="submit"
                            id="submitButton"
                            className="btn btn-primary btn-lg btn-gradient-submit"
                          >
                            <i className="fas fa-rocket"></i> Iniciar Envios
                          </button>
                        </div>
                        <div
                          className="d-grid mt-2"
                          id="stopButtonContainer"
                          style={{ display: stopRequested ? "block" : "none" }}
                        >
                          <button
                            type="button"
                            id="stopButton"
                            className="btn btn-danger btn-lg"
                            onClick={() => setStopRequested(true)}
                          >
                            <i className="fas fa-stop-circle"></i> Parar Envios
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </main>
            <footer className="text-center mt-5">
              <p>
                &copy; 2025 Seu Sistema de Disparos. Todos os direitos
                reservados. | Versão: 2.1.4
              </p>
            </footer>
          </div>
        )}
      </div>
    </>
  );
}
