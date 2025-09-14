-- Select: Own notifications or all for admins
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (user_id = auth.uid()); -- Assuming user_id field; if global, adjust
CREATE POLICY "notifications_select_admin" ON public.notifications FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Insert: System/authenticated
CREATE POLICY "notifications_insert_authenticated" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Update/Delete: Admins or own
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_update_admin" ON public.notifications FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "notifications_delete_admin" ON public.notifications FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Select: All for admins, assigned for vendors/riders
CREATE POLICY "orders_select_admin" ON public.orders FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "orders_select_vendor" ON public.orders FOR SELECT USING (vendor_id = auth.uid() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor');
CREATE POLICY "orders_select_rider" ON public.orders FOR SELECT USING (rider_id = auth.uid() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'rider');

-- Insert: Authenticated (customers/vendors)
CREATE POLICY "orders_insert_authenticated" ON public.orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Update: Admins or assigned riders/vendors
CREATE POLICY "orders_update_admin" ON public.orders FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "orders_update_assigned" ON public.orders FOR UPDATE USING (rider_id = auth.uid() OR vendor_id = auth.uid());

-- Delete: Only admins
CREATE POLICY "orders_delete_admin" ON public.orders FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Select: All for admins, own for riders (if rider_id = auth.uid())
CREATE POLICY "deliveries_select_own" ON public.deliveries FOR SELECT USING (rider_id::uuid = auth.uid());
CREATE POLICY "deliveries_select_admin" ON public.deliveries FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Insert/Update: Admins or system (authenticated)
CREATE POLICY "deliveries_insert_authenticated" ON public.deliveries FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "deliveries_update_admin" ON public.deliveries FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Delete: Only admins
CREATE POLICY "deliveries_delete_admin" ON public.deliveries FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Similar to vendors
CREATE POLICY "riders_select_admin_manager" ON public.riders FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager'));
CREATE POLICY "riders_insert_admin" ON public.riders FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "riders_update_admin" ON public.riders FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "riders_delete_admin" ON public.riders FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Similar to knowledge_base
CREATE POLICY "faqs_select_published" ON public.faqs FOR SELECT USING (published = true AND auth.role() = 'authenticated');
CREATE POLICY "faqs_select_admin" ON public.faqs FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "faqs_insert_admin" ON public.faqs FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "faqs_update_admin" ON public.faqs FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "faqs_delete_admin" ON public.faqs FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Select: Published for authenticated, all for admins
CREATE POLICY "knowledge_base_select_published" ON public.knowledge_base FOR SELECT USING (published = true AND auth.role() = 'authenticated');
CREATE POLICY "knowledge_base_select_admin" ON public.knowledge_base FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Insert/Update/Delete: Only admins
CREATE POLICY "knowledge_base_insert_admin" ON public.knowledge_base FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "knowledge_base_update_admin" ON public.knowledge_base FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "knowledge_base_delete_admin" ON public.knowledge_base FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Select: Messages for own tickets or admin
CREATE POLICY "support_messages_select_own" ON public.support_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
);
CREATE POLICY "support_messages_select_admin" ON public.support_messages FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Insert: For own tickets or admin
CREATE POLICY "support_messages_insert_own" ON public.support_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
);
CREATE POLICY "support_messages_insert_admin" ON public.support_messages FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Update/Delete: Only admins
CREATE POLICY "support_messages_update_admin" ON public.support_messages FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "support_messages_delete_admin" ON public.support_messages FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Select: Own tickets for users, all for admins
CREATE POLICY "support_tickets_select_own" ON public.support_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "support_tickets_select_admin" ON public.support_tickets FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Insert: Authenticated users can create
CREATE POLICY "support_tickets_insert_authenticated" ON public.support_tickets FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Update: Own for users (e.g., update description), all for admins
CREATE POLICY "support_tickets_update_own" ON public.support_tickets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "support_tickets_update_admin" ON public.support_tickets FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Delete: Only admins
CREATE POLICY "support_tickets_delete_admin" ON public.support_tickets FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- vendors (unchanged)
CREATE POLICY "vendors_select_admin_manager" ON public.vendors FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager'));
CREATE POLICY "vendors_insert_admin" ON public.vendors FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "vendors_update_admin" ON public.vendors FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "vendors_delete_admin" ON public.vendors FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- profiles (updated with theme)
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_admin_all" ON public.profiles FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "profiles_insert_admin" ON public.profiles FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_admin_all" ON public.profiles FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- admin (unchanged)
CREATE POLICY "admin_select_admin" ON public.admin FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_insert_admin" ON public.admin FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_update_admin" ON public.admin FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_delete_admin" ON public.admin FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- audit_logs (unchanged)
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

