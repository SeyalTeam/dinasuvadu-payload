import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Disclaimer | Dinasuvadu - Tamil News',
  description: 'Read the disclaimer for Dinasuvadu.com. Understand the limitations of liability, informational purpose of content, and our policies on third-party links.',
  alternates: {
    canonical: 'https://www.dinasuvadu.com/disclaimer',
  },
  openGraph: {
    title: 'Disclaimer | Dinasuvadu',
    description: 'Disclaimer for Dinasuvadu.com — informational purpose, liability limits, and third-party content policies.',
    url: 'https://www.dinasuvadu.com/disclaimer',
    siteName: 'Dinasuvadu',
    locale: 'ta_IN',
    type: 'website',
  },
}

const disclaimerJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://www.dinasuvadu.com/disclaimer',
  url: 'https://www.dinasuvadu.com/disclaimer',
  name: 'Disclaimer – Dinasuvadu',
  description: 'Disclaimer for Dinasuvadu.com covering informational use, liability limitations, third-party links, and author opinions.',
  inLanguage: 'ta',
  isPartOf: { '@id': 'https://www.dinasuvadu.com/#organization' },
  dateModified: '2026-05-01',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.dinasuvadu.com' },
      { '@type': 'ListItem', position: 2, name: 'Disclaimer', item: 'https://www.dinasuvadu.com/disclaimer' },
    ],
  },
}

export default function Disclaimer() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(disclaimerJsonLd) }}
      />
      <div className="site">
        <div className="entry-content" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>

          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Disclaimer</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '32px' }}>
            Last Updated: May 2026 &nbsp;|&nbsp; Applies to: www.dinasuvadu.com
          </p>

          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', marginTop: '28px' }}>
            1. Informational Purpose Only
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            The information provided on this website is intended for general informational and
            educational purposes only. It is not intended to be a substitute for professional
            advice or services, and you should not use the information provided on this website
            in place of seeking such professional advice or services.
          </p>

          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', marginTop: '28px' }}>
            2. No Warranties
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            We make no representations or warranties of any kind, express or implied, about the
            completeness, accuracy, reliability, suitability, or availability with respect to the
            website or the information, products, services, or related graphics contained on the
            website for any purpose. Any reliance you place on such information is therefore
            strictly at your own risk.
          </p>

          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', marginTop: '28px' }}>
            3. Limitation of Liability
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            In no event will we be liable for any loss or damage including, without limitation,
            indirect or consequential loss or damage, or any loss or damage whatsoever arising
            from loss of data or profits arising out of, or in connection with, the use of this
            website.
          </p>

          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', marginTop: '28px' }}>
            4. Third-Party Links
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            We do not endorse or make any representations about any third-party websites that
            may be linked to or from this website. Any reliance you place on any such information
            or content is therefore strictly at your own risk. We encourage you to review the
            privacy policies and terms of use of any third-party websites you visit.
          </p>

          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', marginTop: '28px' }}>
            5. Website Availability
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            Every effort is made to keep the website up and running smoothly. However, we take
            no responsibility for, and will not be liable for, the website being temporarily
            unavailable due to technical issues beyond our control.
          </p>

          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', marginTop: '28px' }}>
            6. Author Opinions
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            Please note that any opinions expressed on this website are solely those of the
            individual authors and do not necessarily represent the views of the website&apos;s
            owners or management. We do not guarantee the accuracy, completeness, or usefulness
            of any information on this website and are not responsible for any errors or
            omissions in the information or any actions taken based on the information provided.
          </p>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginTop: '40px' }}>
            <p style={{ margin: 0 }}>
              If you have questions about this disclaimer, please{' '}
              <a href="/contact-us" style={{ color: 'var(--primary)', fontWeight: '600' }}>contact us</a> or email{' '}
              <a href="mailto:mail@dinasuvadu.com" style={{ color: 'var(--primary)', fontWeight: '600' }}>mail@dinasuvadu.com</a>.
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
