import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us | Dinasuvadu - Tamil News',
  description: 'Get in touch with Dinasuvadu. Reach us for editorial issues, business queries, advertising, or technical support. Contact our Tamil news team.',
  alternates: {
    canonical: 'https://www.dinasuvadu.com/contact-us',
  },
  openGraph: {
    title: 'Contact Us | Dinasuvadu - Tamil News',
    description: 'Get in touch with Dinasuvadu for editorial, business, or technical support.',
    url: 'https://www.dinasuvadu.com/contact-us',
    siteName: 'Dinasuvadu',
    locale: 'ta_IN',
    type: 'website',
  },
}

const contactJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.dinasuvadu.com/#organization',
      name: 'Dinasuvadu',
      url: 'https://www.dinasuvadu.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.dinasuvadu.com/dinasuvadu.svg',
      },
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: '+91-6369693510',
          contactType: 'customer support',
          email: 'mail@dinasuvadu.com',
          areaServed: 'IN',
          availableLanguage: ['Tamil', 'English'],
        },
        {
          '@type': 'ContactPoint',
          contactType: 'editorial',
          email: 'editorial@dinasuvadu.com',
        },
        {
          '@type': 'ContactPoint',
          contactType: 'sales',
          email: 'business@dinasuvadu.com',
        },
      ],
      address: {
        '@type': 'PostalAddress',
        streetAddress: '5A/510, Caldwell Colony, 5th Street, Near Pilaiyar Kovil',
        addressLocality: 'Thoothukudi',
        addressRegion: 'Tamil Nadu',
        postalCode: '628008',
        addressCountry: 'IN',
      },
      sameAs: [
        'https://www.facebook.com/dinasuvadu',
        'https://twitter.com/dinasuvadu',
      ],
    },
    {
      '@type': 'ContactPage',
      '@id': 'https://www.dinasuvadu.com/contact-us',
      url: 'https://www.dinasuvadu.com/contact-us',
      name: 'Contact Us – Dinasuvadu',
      description: 'Contact Dinasuvadu for editorial, business, or technical queries.',
      inLanguage: 'ta',
      isPartOf: { '@id': 'https://www.dinasuvadu.com/#organization' },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.dinasuvadu.com' },
          { '@type': 'ListItem', position: 2, name: 'Contact Us', item: 'https://www.dinasuvadu.com/contact-us' },
        ],
      },
    },
  ],
}

export default function ContactUs() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <div className="site">
        <div className="entry-content" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>

          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>
            எங்களை தொடர்பு கொள்ளுங்கள் — Contact Us
          </h1>
          <p style={{ marginBottom: '32px', color: 'var(--muted-foreground)' }}>
            Thank you for visiting <strong>www.dinasuvadu.com</strong>. We value your feedback and
            would love to hear from you. If you have any questions, comments, or
            suggestions, please feel free to contact us using the information below.
          </p>

          {/* Address & General Contact */}
          <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>📍 Office Address &amp; General Contact</h2>
            <address style={{ fontStyle: 'normal', lineHeight: '1.8' }}>
              <strong>Dinasuvadu Media</strong><br />
              5A/510, Caldwell Colony,<br />
              5th Street, Near Pilaiyar Kovil,<br />
              Thoothukudi, Tamil Nadu – 628008<br />
              India
            </address>
            <p style={{ marginTop: '16px' }}>
              📞 <strong>Phone:</strong>{' '}
              <a href="tel:+916369693510" style={{ color: 'var(--primary)' }}>+91 6369693510</a>
            </p>
            <p style={{ marginTop: '8px' }}>
              📧 <strong>General:</strong>{' '}
              <a href="mailto:mail@dinasuvadu.com" style={{ color: 'var(--primary)' }}>mail@dinasuvadu.com</a>
            </p>
          </section>

          {/* Editorial */}
          <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>✏️ Editorial Issues</h2>
            <p>
              If you encounter any issues or have concerns regarding the content on our
              site — including factual corrections, story suggestions, or editorial feedback
              — please reach out to our editorial team.
            </p>
            <p style={{ marginTop: '12px' }}>
              📧{' '}
              <a href="mailto:editorial@dinasuvadu.com" style={{ color: 'var(--primary)' }}>
                editorial@dinasuvadu.com
              </a>
            </p>
          </section>

          {/* Business */}
          <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>💼 Business &amp; Advertising</h2>
            <p>
              For business-related queries, including partnerships, sponsorships, and
              advertising opportunities, please direct your inquiries to our business team.
            </p>
            <p style={{ marginTop: '12px' }}>
              📧{' '}
              <a href="mailto:business@dinasuvadu.com" style={{ color: 'var(--primary)' }}>
                business@dinasuvadu.com
              </a>
            </p>
          </section>

          {/* Tech */}
          <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>🛠️ Technical Issues</h2>
            <p>
              If you come across any technical issues or need assistance with site
              functionality — such as broken pages, login issues, or display errors — our
              tech team is here to help.
            </p>
            <p style={{ marginTop: '12px' }}>
              📧{' '}
              <a href="mailto:tech@dinasuvadu.com" style={{ color: 'var(--primary)' }}>
                tech@dinasuvadu.com
              </a>
            </p>
          </section>

          <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginTop: '32px' }}>
            We appreciate your support and engagement with Dinasuvadu. Your feedback and
            assistance in improving our platform are invaluable to us. We aim to respond
            to all queries within <strong>24–48 working hours</strong>.
          </p>

        </div>
      </div>
    </>
  )
}
