// ============================================================================
// Fala Tio · Prospecção — Camada de nuvem (Supabase)
//
// Responsável por: autenticação (login), leitura/gravação da base compartilhada
// de escolas, registro de atividades (histórico) e sincronização em tempo real.
// Quando não configurado (config.js vazio) fica inativo e a app usa localStorage.
// ============================================================================

'use strict';

const Cloud = {
  active: false,
  client: null,
  user: null,
  _channel: null,

  // Colunas da tabela "escolas" (espelham os campos usados na app)
  cols: ['id', 'nome', 'cidade', 'estado', 'bairro', 'endereco', 'telefone_escola',
    'site', 'alunos', 'ensino_medio', 'decisor_nome', 'decisor_cargo', 'decisor_telefone',
    'inovacao', 'score', 'nota_enem', 'etapa', 'observacoes', 'notas'],

  configured() {
    return !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase);
  },

  async init() {
    if (!this.configured()) return false;
    this.client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    this.active = true;
    try {
      const { data } = await this.client.auth.getSession();
      this.user = (data && data.session) ? data.session.user : null;
    } catch (e) { this.user = null; }
    return true;
  },

  email() { return this.user ? this.user.email : ''; },

  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.user = data.user;
    return data.user;
  },

  async signOut() {
    if (this._channel) { try { this.client.removeChannel(this._channel); } catch (e) {} this._channel = null; }
    await this.client.auth.signOut();
    this.user = null;
  },

  // Converte uma escola (objeto da app) numa linha da tabela
  _row(e) {
    const r = {};
    this.cols.forEach(c => { r[c] = (e[c] === undefined ? null : e[c]); });
    r.updated_at = new Date().toISOString();
    r.updated_by = this.email();
    return r;
  },

  async fetchAll() {
    const { data, error } = await this.client
      .from('escolas').select('*').order('score', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async upsert(e) {
    const { error } = await this.client.from('escolas').upsert(this._row(e), { onConflict: 'id' });
    if (error) throw error;
  },

  async remove(id) {
    const { error } = await this.client.from('escolas').delete().eq('id', id);
    if (error) throw error;
  },

  async insertMany(list) {
    if (!list.length) return;
    const { error } = await this.client.from('escolas').upsert(list.map(e => this._row(e)), { onConflict: 'id' });
    if (error) throw error;
  },

  // Apaga tudo e insere a lista (usado em substituir / restaurar / semear).
  // Todos os ids são positivos, então "id >= 0" cobre a tabela inteira.
  async replaceAll(list) {
    const { error: delErr } = await this.client.from('escolas').delete().gte('id', 0);
    if (delErr) throw delErr;
    await this.insertMany(list);
  },

  // ---- Histórico de atividades ----
  async logAtividade(acao, escola, detalhe) {
    try {
      await this.client.from('atividades').insert({
        escola_id: escola ? escola.id : null,
        escola_nome: escola ? escola.nome : null,
        acao: acao,
        detalhe: detalhe || null,
        usuario: this.email(),
      });
    } catch (e) { console.warn('Falha ao registrar atividade', e); }
  },

  async fetchAtividades(limit) {
    const { data, error } = await this.client
      .from('atividades').select('*').order('criado_em', { ascending: false }).limit(limit || 100);
    if (error) throw error;
    return data || [];
  },

  // ---- Tempo real ----
  subscribe(onRemote) {
    if (this._channel) return;
    this._channel = this.client
      .channel('rt-escolas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escolas' }, () => onRemote())
      .subscribe();
  },
};

window.Cloud = Cloud;
