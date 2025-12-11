import { cn } from "../utils/cn";

export const Titlebar = () => {
  const isMac = window.electron?.isMac;
  return (
    <header className={cn("titlebar relative", isMac && "mac")}>
      <div className="titlebar-title absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <img
          src="../../icons/logo.svg"
          alt="Home Archive Converter"
          className="titlebar-icon"
        />
        <span>Home Archive Converter</span>
      </div>
      {!isMac && (
        <div className="titlebar-controls">
          <button
            type="button"
            className="titlebar-button minimize"
            onClick={() => {
              window.electron.window.minimize();
            }}
            aria-label="Minimize"
          >
            <svg aria-hidden="true" viewBox="0 0 10 10">
              <path d="M1 5h8" stroke="currentColor" fill="none" />
            </svg>
          </button>
          <button
            type="button"
            className="titlebar-button maximize"
            onClick={() => {
              window.electron.window.maximize();
            }}
            aria-label="Maximize"
          >
            <svg aria-hidden="true" viewBox="0 0 10 10">
              <rect
                x="1.5"
                y="1.5"
                width="7"
                height="7"
                stroke="currentColor"
                fill="none"
              />
            </svg>
          </button>
          <button
            type="button"
            className="titlebar-button close"
            onClick={() => {
              window.electron.window.close();
            }}
            aria-label="Close"
          >
            <svg aria-hidden="true" viewBox="0 0 10 10">
              <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" fill="none" />
            </svg>
          </button>
        </div>
      )}
    </header>
  );
};
