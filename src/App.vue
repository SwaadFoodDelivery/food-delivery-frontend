<template>
  <v-app>
    <!--
      No global chrome. The landing page is specified to show a profile icon and
      nothing else, so each view owns its own header.
    -->
    <router-view />
  </v-app>
</template>
