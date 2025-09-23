// components/support/SupportTickets.tsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCw, Filter, ChevronDown, Clock, User,
  MessageSquare, Star, X, Send, Paperclip, AlertCircle,
  CheckCircle2, FileText, Calendar
} from 'lucide-react';
import { SupportTicket, SupportMessage, supportService } from '../../services/supportService';
import { toast } from 'react-hot-toast';

interface SupportTicketsProps {
  tickets: SupportTicket[];
  loading: boolean;
  onRefresh: () => void;
  isAdmin?: boolean;
}

export default function SupportTickets({ 
  tickets, 
  loading, 
  onRefresh,
  isAdmin = false 
}: SupportTicketsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | SupportTicket['status']>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | SupportTicket['priority']>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | SupportTicket['category']>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch =
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticket_number.includes(searchQuery);
      
      const matchesStatus =