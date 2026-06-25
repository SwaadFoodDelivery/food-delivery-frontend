<template>
  <app-layout>
    <section class="dashboard">
      <div class="dashboard__header">
        <div>
          <p class="page-eyebrow">Signed in</p>
          <h1>{{ auth.user?.name || 'Swaad user' }}</h1>
        </div>
      </div>

      <div class="dashboard__grid">
        <v-sheet class="dashboard-panel" border>
          <v-icon class="dashboard-panel__icon" icon="mdi-account-badge-outline" />
          <h2>Account</h2>
          <dl>
            <div>
              <dt>Role</dt>
              <dd>{{ roleLabel }}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{{ auth.user?.phone }}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{{ auth.user?.account_status }}</dd>
            </div>
          </dl>
        </v-sheet>

        <v-sheet class="dashboard-panel" border>
          <v-icon class="dashboard-panel__icon" icon="mdi-shield-check-outline" />
          <h2>Verification</h2>
          <dl>
            <div>
              <dt>Phone</dt>
              <dd>{{ auth.user?.phone_verified ? 'Verified' : 'Pending' }}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{{ emailStatus }}</dd>
            </div>
          </dl>
          <v-btn
            v-if="auth.needsEmailVerification"
            class="dashboard-panel__action"
            color="warning"
            :to="{ name: 'auth-email' }"
            prepend-icon="mdi-email-check-outline"
          >
            Verify email
          </v-btn>
        </v-sheet>
      </div>
    </section>
  </app-layout>
</template>

<script setup>
import { computed } from 'vue'
import { AUTH_ROLES } from '@/constants/auth'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/layouts/AppLayout.vue'

const auth = useAuthStore()

const roleLabel = computed(() => AUTH_ROLES.find((role) => role.value === auth.user?.role)?.label || auth.user?.role)
const emailStatus = computed(() => {
  if (!auth.user?.email) return 'Not added'
  return auth.user.email_verified ? 'Verified' : 'Pending'
})
</script>

<style scoped>
.dashboard {
  display: grid;
  gap: 24px;
}

.dashboard__header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.dashboard h1 {
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 1.02;
  margin: 0;
}

.dashboard__grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dashboard-panel {
  border-radius: 8px;
  display: grid;
  gap: 18px;
  padding: 24px;
}

.dashboard-panel__icon {
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 8px;
  color: rgb(var(--v-theme-primary));
  height: 44px;
  width: 44px;
}

.dashboard-panel h2 {
  font-size: 1.1rem;
  margin: 0;
}

.dashboard-panel dl {
  display: grid;
  gap: 12px;
  margin: 0;
}

.dashboard-panel dl > div {
  display: flex;
  justify-content: space-between;
}

.dashboard-panel dt {
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 700;
}

.dashboard-panel dd {
  margin: 0;
}

.dashboard-panel__action {
  justify-self: start;
}

@media (max-width: 720px) {
  .dashboard__header {
    align-items: stretch;
    flex-direction: column;
  }

  .dashboard__grid {
    grid-template-columns: 1fr;
  }
}
</style>
