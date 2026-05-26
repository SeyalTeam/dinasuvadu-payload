import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us | Dinasuvadu - Tamil News Portal',
  description: 'Learn about Dinasuvadu, Tamil Nadu\'s trusted Tamil-language news portal established in 2016. Our team of experienced journalists brings you accurate, timely news in Tamil.',
  alternates: {
    canonical: 'https://www.dinasuvadu.com/about-us',
  },
  openGraph: {
    title: 'About Us | Dinasuvadu - Tamil News Portal',
    description: 'Dinasuvadu is Tamil Nadu\'s trusted Tamil-language news portal. Learn about our mission, team, and editorial values.',
    url: 'https://www.dinasuvadu.com/about-us',
    siteName: 'Dinasuvadu',
    locale: 'ta_IN',
    type: 'website',
  },
}

const aboutJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'NewsMediaOrganization',
      '@id': 'https://www.dinasuvadu.com/#organization',
      name: 'Dinasuvadu',
      alternateName: 'தினசுவடு',
      url: 'https://www.dinasuvadu.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.dinasuvadu.com/dinasuvadu.svg',
        width: 200,
        height: 60,
      },
      foundingDate: '2016',
      description: 'Dinasuvadu is a Tamil-language digital news portal providing accurate, timely news coverage of Tamil Nadu, India, and world affairs.',
      inLanguage: 'ta',
      areaServed: {
        '@type': 'Country',
        name: 'India',
      },
      address: {
        '@type': 'PostalAddress',
        streetAddress: '5A/510, Caldwell Colony, 5th Street',
        addressLocality: 'Thoothukudi',
        addressRegion: 'Tamil Nadu',
        postalCode: '628008',
        addressCountry: 'IN',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'editorial',
        email: 'editorial@dinasuvadu.com',
      },
      ethicsPolicy: 'https://www.dinasuvadu.com/terms-conditions',
      masthead: 'https://www.dinasuvadu.com/about-us',
      publishingPrinciples: 'https://www.dinasuvadu.com/terms-conditions',
    },
    {
      '@type': 'AboutPage',
      '@id': 'https://www.dinasuvadu.com/about-us',
      url: 'https://www.dinasuvadu.com/about-us',
      name: 'About Dinasuvadu – Tamil News Portal',
      inLanguage: 'ta',
      isPartOf: { '@id': 'https://www.dinasuvadu.com/#organization' },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.dinasuvadu.com' },
          { '@type': 'ListItem', position: 2, name: 'About Us', item: 'https://www.dinasuvadu.com/about-us' },
        ],
      },
    },
  ],
}

export default function AboutUs() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <div className="site">
        <div className="entry-content" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>

          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>
            எங்களைப் பற்றி — About Dinasuvadu
          </h1>
          <p style={{ fontSize: '18px', marginBottom: '32px', color: 'var(--muted-foreground)', lineHeight: '1.7' }}>
            Tamil Nadu&apos;s trusted Tamil-language digital news portal, delivering accurate and timely news since 2016.
          </p>

          {/* Mission */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>🎯 Our Mission</h2>
            <p style={{ lineHeight: '1.8' }}>
              <strong>Dinasuvadu.com</strong> is proud to offer high-quality news and information in the Tamil
              language. Our mission is to deliver accurate, fair, and timely reporting on politics,
              business, sports, entertainment, and world affairs — in the language our readers
              call their own.
            </p>
            <p style={{ lineHeight: '1.8', marginTop: '12px' }}>
              We believe that access to accurate and informative news coverage is essential to the
              well-being of the Tamil-speaking community. Every story we publish is guided by our
              commitment to truth, balance, and journalistic integrity.
            </p>
          </section>

          {/* Who we are */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>👥 Who We Are</h2>
            <p style={{ lineHeight: '1.8' }}>
              Dinasuvadu was founded in <strong>2016</strong> with a simple goal: to provide the Tamil-speaking
              community with a reliable, digital-first news source. Over <strong>8 years</strong>, we have grown
              into one of Tamil Nadu&apos;s most-read Tamil digital news portals.
            </p>
            <p style={{ lineHeight: '1.8', marginTop: '12px' }}>
              Our team comprises experienced <strong>Tamil journalists, editors, and digital media
              professionals</strong> who cover a wide range of topics — from state and national politics
              to cinema, sports, science, and international affairs. Each member of our editorial
              team is committed to the highest standards of accuracy and professionalism.
            </p>
          </section>

          {/* Coverage */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>📰 What We Cover</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
              {['Tamil Nadu Politics', 'National News', 'World Affairs', 'Cinema & Entertainment', 'Sports', 'Business & Economy', 'Science & Technology', 'Lifestyle & Health'].map((topic) => (
                <div key={topic} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>
                  {topic}
                </div>
              ))}
            </div>
          </section>

          {/* Editorial Policy */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>📋 Our Editorial Policy</h2>
            <p style={{ lineHeight: '1.8' }}>
              At Dinasuvadu, we adhere to the following editorial principles:
            </p>
            <ul style={{ lineHeight: '2', marginTop: '12px', paddingLeft: '20px' }}>
              <li><strong>Accuracy:</strong> Every story is verified before publication. We correct errors promptly and transparently.</li>
              <li><strong>Fairness:</strong> We present multiple perspectives on contested issues and avoid sensationalism.</li>
              <li><strong>Independence:</strong> Our editorial decisions are made independently of advertisers and sponsors.</li>
              <li><strong>Accountability:</strong> We take responsibility for our reporting and welcome feedback from our readers.</li>
              <li><strong>Privacy:</strong> We respect the privacy of individuals, especially in sensitive stories.</li>
            </ul>
          </section>

          {/* Contact CTA */}
          <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>📬 Get In Touch</h2>
            <p>
              Have a story tip, feedback, or business inquiry? We&apos;d love to hear from you.
            </p>
            <p style={{ marginTop: '12px' }}>
              📧 <a href="mailto:mail@dinasuvadu.com" style={{ color: 'var(--primary)', fontWeight: '600' }}>mail@dinasuvadu.com</a>
              &nbsp;|&nbsp;
              📞 <a href="tel:+916369693510" style={{ color: 'var(--primary)', fontWeight: '600' }}>+91 6369693510</a>
            </p>
            <p style={{ marginTop: '8px' }}>
              <a href="/contact-us" style={{ color: 'var(--primary)', fontWeight: '600' }}>→ Visit our Contact Page</a>
            </p>
          </section>

          <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginTop: '24px' }}>
            Thank you for choosing <strong>www.dinasuvadu.com</strong> as your trusted source for Tamil news.
            We are proud to serve the Tamil-speaking community and look forward to continuing to
            bring you quality journalism for years to come.
          </p>

        </div>
      </div>
    </>
  )
}
