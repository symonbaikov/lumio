import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export type WorkspaceInvitationEmailProps = {
  workspaceName: string;
  invitationLink: string;
  invitedBy?: string | null;
  roleLabel?: string | null;
};

export function WorkspaceInvitationEmail({
  workspaceName,
  invitationLink,
  invitedBy,
  roleLabel,
}: WorkspaceInvitationEmailProps) {
  const previewText = `Приглашение в рабочее пространство ${workspaceName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            <Text style={styles.brand}>Lumio</Text>
            <Heading style={styles.h1}>Приглашение в рабочее пространство</Heading>
            <Text style={styles.text}>
              {invitedBy ? (
                <>
                  <strong>{invitedBy}</strong> приглашает вас присоединиться к{' '}
                </>
              ) : (
                <>Вас приглашают присоединиться к </>
              )}
              <strong>{workspaceName}</strong>.
            </Text>
            {roleLabel ? <Text style={styles.meta}>Роль: {roleLabel}</Text> : null}

            <Section style={styles.buttonWrap}>
              <Button href={invitationLink} style={styles.button}>
                Принять приглашение
              </Button>
            </Section>

            <Text style={styles.muted}>Если кнопка не открывается, используйте ссылку:</Text>
            <Text style={styles.link}>{invitationLink}</Text>

            <Hr style={styles.hr} />
            <Text style={styles.footer}>
              Ссылка действует 7 дней. Если вы не ожидали это письмо — просто проигнорируйте его.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function workspaceInvitationEmailText({
  workspaceName,
  invitationLink,
  invitedBy,
  roleLabel,
}: WorkspaceInvitationEmailProps) {
  const invitedByPart = invitedBy
    ? `${invitedBy} приглашает вас присоединиться к`
    : 'Вас приглашают присоединиться к';
  const rolePart = roleLabel ? `\nРоль: ${roleLabel}` : '';

  return `${invitedByPart} «${workspaceName}».${rolePart}\n\nПринять приглашение: ${invitationLink}\n\nСсылка действует 7 дней.`;
}

const styles = {
  main: {
    backgroundColor: '#f6f9fc',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    padding: '24px 0',
  },
  container: {
    margin: '0 auto',
    padding: '0 12px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '28px',
    maxWidth: '560px',
    margin: '0 auto',
  },
  brand: {
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: '#2563eb',
    margin: '0 0 14px',
  },
  h1: {
    fontSize: '22px',
    lineHeight: '1.3',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 12px',
  },
  text: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#0f172a',
    margin: '0 0 10px',
  },
  meta: {
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#334155',
    margin: '0 0 16px',
  },
  buttonWrap: {
    margin: '18px 0 18px',
  },
  button: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    padding: '12px 18px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  muted: {
    fontSize: '12px',
    lineHeight: '1.6',
    color: '#64748b',
    margin: '0 0 8px',
  },
  link: {
    fontSize: '12px',
    lineHeight: '1.6',
    color: '#2563eb',
    wordBreak: 'break-all' as const,
    margin: '0 0 16px',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '20px 0',
  },
  footer: {
    fontSize: '12px',
    lineHeight: '1.6',
    color: '#64748b',
    margin: '0',
  },
};
