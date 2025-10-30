import Head from "next/head";
import { useEffect, useRef, useState } from "react";
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
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: linear-gradient(135deg, #000000 0%, #001a00 50%, #000000 100%);
            color: #00ff88; 
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            overflow: hidden;
          }
          .login-wrapper { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh;
            position: relative;
            z-index: 1;
          }
          .login-wrapper::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
              radial-gradient(circle at 20% 80%, rgba(0, 255, 136, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(0, 204, 102, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(0, 255, 136, 0.05) 0%, transparent 50%);
            animation: pulseGlow 8s ease-in-out infinite;
          }
          @keyframes pulseGlow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          .login-card { 
            background: linear-gradient(145deg, rgba(0, 0, 0, 0.9), rgba(0, 26, 0, 0.8));
            border: 2px solid rgba(0, 255, 136, 0.3);
            border-radius: 24px; 
            padding: 3rem 2.5rem; 
            box-shadow: 
              0 0 60px rgba(0, 255, 136, 0.2),
              0 20px 60px rgba(0, 0, 0, 0.8),
              inset 0 0 20px rgba(0, 255, 136, 0.05);
            backdrop-filter: blur(10px);
            position: relative;
            overflow: hidden;
            max-width: 440px;
            width: 100%;
          }
          .login-card::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #00ff88, #00cc66, #00ff88);
            border-radius: 24px;
            z-index: -1;
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .login-card:hover::before {
            opacity: 0.3;
            animation: borderGlow 2s linear infinite;
          }
          @keyframes borderGlow {
            0%, 100% { filter: hue-rotate(0deg); }
            50% { filter: hue-rotate(20deg); }
          }
          .logo-container {
            text-align: center;
            margin-bottom: 2rem;
          }
          .logo-icon {
            font-size: 4rem;
            color: #00ff88;
            filter: drop-shadow(0 0 20px rgba(0, 255, 136, 0.6));
            animation: float 3s ease-in-out infinite;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .brand-title {
            font-size: 1.8rem;
            font-weight: 700;
            background: linear-gradient(90deg, #00ff88, #00cc66, #00ff88);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-top: 0.5rem;
            letter-spacing: 1px;
          }
          .brand-subtitle {
            color: rgba(0, 255, 136, 0.6);
            font-size: 0.9rem;
            font-weight: 300;
            margin-top: 0.3rem;
          }
          .login-title {
            color: #00ff88;
            font-weight: 600;
            font-size: 1.3rem;
            margin-bottom: 2rem;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .form-floating { position: relative; margin-bottom: 1.5rem; }
          .form-control { 
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(0, 255, 136, 0.3);
            color: #00ff88;
            border-radius: 12px;
            padding: 1rem 1rem 1rem 3rem;
            font-size: 1rem;
            transition: all 0.3s ease;
            height: 56px;
          }
          .form-control:focus { 
            background: rgba(0, 0, 0, 0.8);
            border-color: #00ff88;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
            outline: none;
            color: #00ff88;
          }
          .form-control::placeholder {
            color: rgba(0, 255, 136, 0.4);
          }
          .form-floating label {
            color: rgba(0, 255, 136, 0.7);
            font-weight: 400;
            padding-left: 3rem;
            font-size: 0.9rem;
          }
          .form-floating .form-control:focus ~ label,
          .form-floating .form-control:not(:placeholder-shown) ~ label {
            color: #00ff88;
            transform: scale(0.85) translateY(-0.5rem) translateX(0.15rem);
          }
          .input-icon {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: #00ff88;
            font-size: 1.2rem;
            z-index: 2;
            filter: drop-shadow(0 0 5px rgba(0, 255, 136, 0.5));
          }
          .btn-gradient-submit { 
            background: linear-gradient(135deg, #00ff88 0%, #00cc66 100%);
            border: none;
            font-weight: 600;
            padding: 1rem 2rem;
            border-radius: 12px;
            transition: all 0.3s ease;
            box-shadow: 0 8px 25px rgba(0, 255, 136, 0.3);
            color: #000;
            font-size: 1.1rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            position: relative;
            overflow: hidden;
          }
          .btn-gradient-submit::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.5s ease;
          }
          .btn-gradient-submit:hover::before {
            left: 100%;
          }
          .btn-gradient-submit:hover { 
            transform: translateY(-3px);
            box-shadow: 0 12px 35px rgba(0, 255, 136, 0.5);
          }
          .btn-gradient-submit:active {
            transform: translateY(-1px);
          }
          .alert-danger {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid rgba(255, 68, 68, 0.3);
            color: #ff4444;
            border-radius: 8px;
            padding: 0.8rem;
            font-size: 0.9rem;
          }
          .register-link {
            text-align: center;
            margin-top: 1.5rem;
            color: rgba(0, 255, 136, 0.6);
            font-size: 0.9rem;
          }
          .register-link a {
            color: #00ff88;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
          }
          .register-link a:hover {
            color: #00cc66;
            text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
          }
        `}</style>
      </Head>

      <div className="container-fluid p-0">
        {!loggedIn ? (
          <div className="login-wrapper" id="loginContainer">
            <div className="col-lg-4 col-md-6 col-sm-8 col-11">
              <div className="login-card">
                <div className="logo-container">
                  <div className="logo-icon">
                    <i className="fab fa-whatsapp"></i>
                  </div>
                  <h1 className="brand-title">WhatsApp SaaS</h1>
                  <p className="brand-subtitle">Sistema de Gestão e Automação</p>
                </div>
                
                <h3 className="login-title">Acesso ao Sistema</h3>
                
                <form id="loginForm" onSubmit={handleLogin}>
                  <div className="form-floating">
                    <i className="fas fa-user input-icon"></i>
                    <input
                      className="form-control"
                      id="username"
                      placeholder="Email ou usuário"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                    />
                    <label htmlFor="username">Email ou usuário</label>
                  </div>
                  
                  <div className="form-floating">
                    <i className="fas fa-lock input-icon"></i>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      placeholder="Senha"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <label htmlFor="password">Senha</label>
                  </div>
                  
                  {loginFeedback && (
                    <div className="mb-3">
                      <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i> {loginFeedback}
                      </div>
                    </div>
                  )}
                  
                  <div className="d-grid">
                    <button
                      className="btn btn-lg btn-gradient-submit"
                      type="submit"
                    >
                      <i className="fas fa-sign-in-alt"></i> Entrar
                    </button>
                  </div>
                </form>
                
                <div className="register-link">
                  Não tem uma conta? <a href="/signup">Criar conta</a>
                </div>
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
