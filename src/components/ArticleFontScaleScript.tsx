/**
 * Applies stored article font scale before first paint to avoid CLS from PostImageActions hydration.
 */
export function ArticleFontScaleScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var s=localStorage.getItem("dinasuvadu_article_font_scale");if(!s)return;var n=parseFloat(s);if(n>=0.9&&n<=1.25)document.documentElement.style.setProperty("--article-font-scale",String(n))}catch(e){}})();`,
      }}
    />
  );
}
