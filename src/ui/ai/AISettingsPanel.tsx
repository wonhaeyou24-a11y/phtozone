import { useAISettingsStore } from '../../state/aiSettingsStore';
import { AI_PROVIDERS } from '../../ai/aiManager';
import styles from './AISettingsPanel.module.css';

/**
 * AI is entirely optional (spec sections 21, 54) — the whole app works without ever opening this
 * screen. The API key lives only in this store's in-memory state for the current tab session;
 * it is never written to localStorage/IndexedDB and is lost on refresh by design.
 */
export function AISettingsPanel() {
  const { enabled, providerId, model, apiKey, setEnabled, setProviderId, setModel, setApiKey } =
    useAISettingsStore();

  return (
    <section className={styles.wrap}>
      <h2>AI 2차 분석 설정</h2>
      <p className={styles.hint}>
        AI는 선택 기능입니다. 설정하지 않아도 사진 분석·매칭·그룹화·Excel 생성 등 모든 기능이 정상 동작합니다.
        API Key는 이 화면을 벗어나거나 새로고침하면 사라지며, 어디에도 저장되지 않습니다.
      </p>

      <label className={styles.toggleRow}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <span>AI 2차 분석 사용</span>
      </label>

      <div className={styles.field}>
        <span>AI Provider</span>
        <select value={providerId} onChange={(e) => setProviderId(e.target.value)} disabled={!enabled}>
          {AI_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <span>모델</span>
        <input value={model} onChange={(e) => setModel(e.target.value)} disabled={!enabled} />
      </div>

      <div className={styles.field}>
        <span>API Key</span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={!enabled}
          placeholder="sk-..."
          autoComplete="off"
        />
      </div>

      <p className={styles.note}>
        분석 대상은 그룹 탭의 각 페이지 카드에서 개별적으로 "AI 2차 분석" 버튼을 눌러 선택합니다.
      </p>
    </section>
  );
}
