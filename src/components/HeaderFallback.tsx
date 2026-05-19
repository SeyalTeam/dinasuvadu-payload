import Link from "next/link";
import Image from "next/image";

/** Minimal header shell while category nav loads — keeps article HTML streaming. */
export function HeaderFallback() {
  return (
    <header className="site-main">
      <div className="main-header">
        <div className="site">
          <div
            className="header-one"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Link href="/" className="logo-link">
              <Image
                src="/dinasuvadu.svg"
                alt="Dinasuvadu Logo"
                width={180}
                height={40}
                className="logo"
              />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
