import { ref, type Ref } from "vue";

/**
 * Opening the database waits on other tabs that still have an older
 * version open. Its own module, so the app shell (App.vue's notice) doesn't
 * load idb with useIndexedDBStore.
 */
export const dbBlocked: Ref<boolean> = ref(false);
