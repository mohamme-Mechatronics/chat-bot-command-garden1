import { createFileRoute } from '@tanstack/react-router';
import { AdminApp } from '@/components/admin-app';
export const Route = createFileRoute('/')({ head:()=>({meta:[{title:'المحادثات | إدارة تمكين'},{name:'description',content:'إدارة محادثات عملاء تمكين على واتساب وتلجرام.'},{property:'og:title',content:'المحادثات | تمكين'},{property:'og:description',content:'مركز محادثات العملاء الموحّد.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <AdminApp/> });
