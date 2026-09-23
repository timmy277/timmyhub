// Barrel export cho mọi custom hook (`use*`) của frontend — hook không khai báo trong component hay
// trong `features/`. Store zustand nằm ở `@/store`, không ở đây. Nơi khác trong repo chỉ import qua
// `@/hooks`, không import thẳng file con.
export * from './use-locale-switch'
export * from './use-theme-attributes-sync'
