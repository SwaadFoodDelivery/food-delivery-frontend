<template>
  <v-app>
    <v-main>
      <v-container class="auth-layout">
        <div class="auth-layout__panel">
          <slot />
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.auth-layout {
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 16px;
}

.auth-layout__panel {
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: 100%;
  max-width: 420px;
}
</style>
