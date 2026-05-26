import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms and Conditions | Dinasuvadu - Tamil News',
  description: 'Read the Terms and Conditions for using Dinasuvadu.com. Understand your rights, user conduct, intellectual property, liability, and governing law.',
  alternates: {
    canonical: 'https://www.dinasuvadu.com/terms-conditions',
  },
  openGraph: {
    title: 'Terms and Conditions | Dinasuvadu',
    description: 'Terms and Conditions for Dinasuvadu.com — user conduct, intellectual property, liability, and governing law.',
    url: 'https://www.dinasuvadu.com/terms-conditions',
    siteName: 'Dinasuvadu',
    locale: 'ta_IN',
    type: 'website',
  },
}

const termsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://www.dinasuvadu.com/terms-conditions',
  url: 'https://www.dinasuvadu.com/terms-conditions',
  name: 'Terms and Conditions – Dinasuvadu',
  description: 'Terms of Use for Dinasuvadu.com covering user conduct, intellectual property, liability disclaimer, content submissions, and governing law.',
  inLanguage: 'ta',
  isPartOf: { '@id': 'https://www.dinasuvadu.com/#organization' },
  dateModified: '2026-05-01',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.dinasuvadu.com' },
      { '@type': 'ListItem', position: 2, name: 'Terms & Conditions', item: 'https://www.dinasuvadu.com/terms-conditions' },
    ],
  },
}

export default function TermsConditions() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(termsJsonLd) }}
      />
      <div className="site">
        <div className="entry-content" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>

          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Terms and Conditions</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '32px' }}>
            Last Updated: May 2026 &nbsp;|&nbsp; Applies to: www.dinasuvadu.com
          </p>

          <p style={{ lineHeight: '1.8', marginBottom: '24px' }}>
            Welcome to <strong>Dinasuvadu.com</strong>. By accessing or using our website, you agree to be
            bound by these Terms of Use. If you do not agree to these Terms of Use, please do
            not use our website.
          </p>

          {/* Terms of Use */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            1. Terms of Use
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            Dinasuvadu.com provides news and information related to India. The content provided
            on our website is for informational purposes only and is not intended to be a
            substitute for professional advice. We reserve the right to change or modify the
            content, services, and features of our website at any time without notice.
          </p>

          {/* User Conduct */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            2. User Conduct
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            By using our website, you agree not to use our website for any unlawful purpose or
            in any way that could damage, disable, overburden, or impair our website. You
            further agree not to engage in any conduct that could interfere with the operation
            of our website, including but not limited to hacking, spamming, or any other
            similar activities.
          </p>

          {/* Intellectual Property */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            3. Intellectual Property
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            All content on our website, including but not limited to text, graphics, logos,
            images, and software, is the property of Dinasuvadu.com or its content suppliers
            and is protected by Indian and international copyright laws. You may not reproduce,
            distribute, or modify any content on our website without our prior written consent.
          </p>

          {/* Third-party links */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            4. Links to Third-Party Websites
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            Our website may contain links to third-party websites that are not owned or
            controlled by Dinasuvadu.com. We have no control over the content, policies, and
            practices of these third-party websites and are not responsible for any damages or
            losses caused by your use of such websites. We encourage you to review the terms of
            use and privacy policies of any third-party websites before using them.
          </p>

          {/* Liability */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            5. Limitation of Liability
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            Dinasuvadu.com is not liable for any direct, indirect, incidental, consequential,
            or punitive damages arising from the use of our website or any content on our
            website. We make no representations or warranties of any kind, express or implied,
            about the completeness, accuracy, reliability, suitability, or availability with
            respect to our website or the content on our website.
          </p>

          {/* Indemnification */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            6. Indemnification
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            You agree to indemnify, defend, and hold harmless Dinasuvadu.com and its
            affiliates, officers, directors, employees, and agents from any and all claims,
            damages, losses, liabilities, and expenses (including but not limited to
            attorneys&apos; fees) arising from your use of our website or any violation of these
            Terms of Use.
          </p>

          {/* Disclaimer of Liability */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            7. Disclaimer of Liability
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            Dinasuvadu.com provides news and information related to India for informational
            purposes only. While we strive to provide accurate and up-to-date information, we
            make no representations or warranties about the completeness or accuracy of any
            content. Any reliance you place on such information is strictly at your own risk.
          </p>
          <p style={{ lineHeight: '1.8', marginTop: '12px' }}>
            Dinasuvadu.com is not responsible for any damages caused by viruses, malware, or
            other harmful components that may affect your devices through use of our website or
            any linked third-party websites.
          </p>

          {/* Under 18 */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            8. Users Under 18
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            Dinasuvadu.com is committed to providing a safe and secure environment for all
            users. If you are under the age of 18, you must obtain the consent of a parent or
            legal guardian before using our website or providing any personal information. We do
            not knowingly collect personal information from children under 18 without parental
            consent. If we become aware of such a case, we will delete the information immediately.
          </p>

          {/* Third-party material */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            9. Third-Party Material on Dinasuvadu.com
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            Dinasuvadu.com may contain links to third-party websites, advertisements, or other
            materials. We do not endorse or assume responsibility for any such third-party
            materials. Any opinions, advice, or statements made by third parties are those of
            the respective author(s) and not of Dinasuvadu.com.
          </p>

          {/* Text Submission */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            10. Text Submission
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            Dinasuvadu.com welcomes user submissions of text, such as news tips, articles, and
            comments. By submitting text to our website, you grant Dinasuvadu.com a
            non-exclusive, royalty-free, perpetual, irrevocable, and fully sublicensable right
            to use, reproduce, modify, adapt, publish, and distribute such content worldwide.
            You represent that you own or have the necessary rights to submit such content and
            that it does not infringe on any third-party rights.
          </p>

          {/* Graphic Submission */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            11. Graphic Material Submission
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            Dinasuvadu.com welcomes user submissions of graphic materials such as images,
            videos, and audio recordings. By submitting such materials, you grant Dinasuvadu.com
            a non-exclusive, royalty-free, perpetual, and fully sublicensable right to use,
            reproduce, modify, adapt, publish, and distribute the material worldwide. You
            represent that you own the necessary rights and that the material does not infringe
            any third-party rights. We reserve the right to remove any content that violates
            our Terms of Use or applicable laws.
          </p>

          {/* Safety */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            12. Safety
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            At Dinasuvadu.com, we are committed to user safety. We recommend:
          </p>
          <ol style={{ lineHeight: '2', paddingLeft: '20px', marginTop: '12px' }}>
            <li>Do not share personal information (name, address, phone) with strangers online.</li>
            <li>Be cautious when communicating with other users you do not know well.</li>
            <li>Report suspicious activity immediately via our <a href="/contact-us" style={{ color: 'var(--primary)' }}>contact page</a>.</li>
            <li>Use strong, unique passwords and keep your devices updated with security patches.</li>
          </ol>

          {/* Governing Law */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            13. Governing Law &amp; Jurisdiction
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            These Terms of Use are governed by and construed in accordance with the laws of
            India. Any disputes arising from these Terms or your use of our website shall be
            resolved exclusively by the courts of India.
          </p>

          {/* Modification */}
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', marginTop: '32px' }}>
            14. Modification of Terms
          </h2>
          <p style={{ lineHeight: '1.8' }}>
            Dinasuvadu.com reserves the right to modify these Terms of Use at any time without
            notice. Your continued use of our website following any such modifications
            constitutes your acceptance of the revised Terms of Use. We recommend reviewing
            this page periodically.
          </p>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginTop: '40px' }}>
            <p style={{ margin: 0 }}>
              If you have any questions or concerns about these Terms, please{' '}
              <a href="/contact-us" style={{ color: 'var(--primary)', fontWeight: '600' }}>contact us</a> or email{' '}
              <a href="mailto:mail@dinasuvadu.com" style={{ color: 'var(--primary)', fontWeight: '600' }}>mail@dinasuvadu.com</a>.
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
