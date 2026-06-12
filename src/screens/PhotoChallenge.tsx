import { useState } from "react";
import { PHOTO_MISSION, PHOTO_POINTS } from "../data";
import { useGame } from "../state";
import { CameraIcon, CheckIcon, SparkIcon } from "../components/Icons";

type Stage = "brief" | "shutter" | "preview" | "submitted";

export function PhotoChallenge() {
  const game = useGame();
  const [stage, setStage] = useState<Stage>(
    game.photoSubmitted ? "submitted" : "brief"
  );

  const takePhoto = () => {
    setStage("shutter");
    setTimeout(() => setStage("preview"), 700);
  };

  return (
    <div className="screen photo">
      <header className="screen-header">
        <span className="screen-kicker">Desafio Fotográfico</span>
        <h1>{PHOTO_MISSION.title}</h1>
        <p className="screen-sub">{PHOTO_MISSION.description}</p>
      </header>

      <div className={`photo-frame ${stage === "shutter" ? "flash" : ""}`}>
        {stage === "brief" || stage === "shutter" ? (
          <div className="photo-placeholder">
            <CameraIcon size={42} color="rgba(255,255,255,0.35)" />
            <span>O enquadramento aparece aqui</span>
          </div>
        ) : (
          <FakePhoto />
        )}
        {stage === "submitted" && (
          <div className="photo-badge">
            <SparkIcon size={14} color="#1B1B47" /> Em destaque nos ecrãs do parque
          </div>
        )}
      </div>

      <div className="photo-actions">
        {stage === "brief" || stage === "shutter" ? (
          <button className="btn-primary btn-block" onClick={takePhoto}>
            <CameraIcon size={18} color="#1B1B47" /> Tirar foto
          </button>
        ) : stage === "preview" ? (
          <>
            <button
              className="btn-primary btn-block"
              onClick={() => {
                game.submitPhoto();
                setStage("submitted");
              }}
            >
              Submeter com {PHOTO_MISSION.hashtag}
            </button>
            <button className="btn-ghost btn-block" onClick={() => setStage("brief")}>
              Repetir
            </button>
          </>
        ) : (
          <div className="photo-submitted">
            <span className="photo-submitted-check">
              <CheckIcon size={14} color="#fff" />
            </span>
            <div>
              <strong>Foto submetida · +{PHOTO_POINTS} pontos</strong>
              <small>
                As melhores fotos do dia rodam nos painéis do Hopi Hari e no
                Instagram oficial com {PHOTO_MISSION.hashtag}.
              </small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Stylized "photo" of a visitor posing in front of Montezum — an
// intentional flat illustration standing in for the camera.
function FakePhoto() {
  return (
    <svg className="fake-photo" viewBox="0 0 320 230" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFB45E" />
          <stop offset="1" stopColor="#E0566B" />
        </linearGradient>
      </defs>
      <rect width="320" height="230" fill="url(#sky)" />
      <circle cx="262" cy="48" r="26" fill="rgba(255,255,255,0.6)" />
      <path
        d="M-10 190 -10 130 Q 50 40 100 130 Q 145 65 190 135 Q 235 85 275 140 L330 120 330 230 -10 230Z"
        fill="rgba(60,24,40,0.85)"
      />
      <path
        d="M15 190V140M55 190V118M95 190V128M140 190V120M185 190V132M230 190V128M275 190V142"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="5"
      />
      <rect x="-10" y="188" width="340" height="42" fill="#3C1828" />
      <g>
        <circle cx="160" cy="138" r="16" fill="#F5C89F" />
        <path d="M160 154c-16 0-26 12-26 34h52c0-22-10-34-26-34Z" fill="#FFC72C" />
        <path d="M140 162l-18-22M180 162l18-22" stroke="#F5C89F" strokeWidth="9" strokeLinecap="round" />
        <path d="M150 132q10 10 20 0" stroke="#3C1828" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="153" cy="134" r="2.4" fill="#3C1828" />
        <circle cx="167" cy="134" r="2.4" fill="#3C1828" />
      </g>
    </svg>
  );
}
