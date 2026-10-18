import { createFileRoute } from '@tanstack/react-router';
import { AdminApp } from '@/components/admin-app';
export const Route = createFileRoute('/')({ head:()=>({meta:[{title:'المحادثات | إدارة عرش الهندسة'},{name:'description',content:'إدارة محادثات عملاء عرش الهندسة على واتساب وتلجرام.'},{property:'og:title',content:'المحادثات | عرش الهندسة'},{property:'og:description',content:'مركز محادثات العملاء الموحّد.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <AdminApp/> });
