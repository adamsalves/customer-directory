<script setup lang="ts">
import S from './AppFooter.module.scss'
</script>

<template>
  <footer :class="S.Footer">
    <p :class="S.Text">Siga-nos nas redes sociais:</p>
    <ul :class="S.List">
      <li>
        <a
          href="https://www.facebook.com/juntossomosmais"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook (abre em nova aba)"
          :class="S.Link"
          data-testid="footer__social--link"
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M14.5 8H13c-.7 0-1 .4-1 1v2h2.5l-.4 3H12v7H9v-7H7v-3h2V8.6C9 6.5 10.3 5 12.6 5h1.9z"
            />
          </svg>
        </a>
      </li>
      <li>
        <a
          href="https://www.linkedin.com/company/juntossomosmais"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn (abre em nova aba)"
          :class="S.Link"
          data-testid="footer__social--link"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4.5" y="9" width="3" height="10" />
            <circle cx="6" cy="5.8" r="1.7" />
            <path
              d="M10 9h2.9v1.4c.5-.9 1.6-1.6 3.1-1.6 2.6 0 3.5 1.6 3.5 4.2V19h-3v-5.4c0-1.3-.3-2.3-1.6-2.3-1.4 0-1.9 1-1.9 2.4V19h-3z"
            />
          </svg>
        </a>
      </li>
      <li>
        <a
          href="https://www.instagram.com/juntossomosmais"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram (abre em nova aba)"
          :class="S.Link"
          data-testid="footer__social--link"
        >
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="4.5" y="4.5" width="15" height="15" rx="4.5" />
            <circle cx="12" cy="12" r="3.4" />
            <circle cx="16.7" cy="7.3" r="0.6" fill="currentColor" />
          </svg>
        </a>
      </li>
    </ul>
  </footer>
</template>
