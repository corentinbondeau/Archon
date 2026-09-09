"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { Etat } from "@/components/ui/Etat";
import { Bouton } from "@/components/ui/Bouton";
import type { ConversationDomaine, MessageDomaine } from "@/types/domaine";

interface ProprietesFilConversation {
  foyerId: string;
  utilisateurId: string;
  titresParUtilisateur: Record<string, string>;
}

export function FilConversation({
  foyerId,
  utilisateurId,
  titresParUtilisateur,
}: ProprietesFilConversation): React.JSX.Element {
  const [conversations, setConversations] = useState<ConversationDomaine[] | null>(
    null
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [contenu, setContenu] = useState("");
  const basDuFilRef = useRef<HTMLDivElement | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const reponse = await fetch(
        `/api/conversations?foyerId=${encodeURIComponent(foyerId)}`,
        { cache: "no-store" }
      );
      if (!reponse.ok) throw new Error("Chargement des messages impossible");
      const corps = (await reponse.json()) as { conversations: ConversationDomaine[] };
      setConversations(corps.conversations);
    } catch (cause) {
      setErreur(
        cause instanceof Error ? cause.message : "Impossible de charger les messages"
      );
    }
  }, [foyerId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    basDuFilRef.current?.scrollIntoView({ block: "end" });
  }, [conversations]);

  const conversationActive = conversations?.[0] ?? null;

  const envoyerMessage = async (evenement: React.FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    if (!conversationActive || !contenu.trim()) return;

    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch(
        `/api/conversations?conversationId=${encodeURIComponent(conversationActive.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contenu: contenu.trim() }),
        }
      );
      if (!reponse.ok) throw new Error("Impossible d'envoyer le message");
      setContenu("");
      await charger();
    } catch (cause) {
      setErreur(
        cause instanceof Error ? cause.message : "Impossible d'envoyer le message"
      );
    } finally {
      setEnvoiEnCours(false);
    }
  };

  if (erreur && conversations === null) {
    return (
      <Etat
        type="erreur"
        message={erreur}
        action={<Bouton variante="contour" onClick={() => void charger()}>Réessayer</Bouton>}
      />
    );
  }

  if (conversations === null) {
    return <Etat type="chargement" message="Chargement des conversations…" />;
  }

  if (conversations.length === 0) {
    return (
      <Etat
        type="vide"
        titre="Aucune conversation"
        description="Votre foyer n'a pas encore de fil de discussion."
      />
    );
  }

  const conversation = conversations[0] as ConversationDomaine;
  const messages = conversation.messages;

  return (
    <div className="flex h-[70vh] flex-col">
      <div className="border-b border-fond-surface-claire px-1 pb-2">
        <h2 className="text-base font-semibold text-texte">
          {conversation.titre}
        </h2>
        <p className="text-xs text-texte-attenue">
          Conversation du foyer · {messages.length} message
          {messages.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <Etat
            type="vide"
            titre="Aucun message pour l'instant"
            description="Lancez la conversation avec votre famille."
          />
        ) : (
          messages.map((message) => (
            <MessageBulles
              key={message.id}
              message={message}
              estMoi={message.auteurId === utilisateurId}
              nomAuteur={titresParUtilisateur[message.auteurId] ?? "Membre"}
            />
          ))
        )}
        <div ref={basDuFilRef} />
      </div>

      {erreur && (
        <p className="mb-2 text-sm text-accent" role="alert">
          {erreur}
        </p>
      )}

      <form onSubmit={envoyerMessage} className="flex gap-2 pt-2">
        <input
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Écrire un message à votre famille…"
          className="flex-1 rounded-xl border border-fond-surface-claire bg-fond-surface px-4 py-2.5 text-texte placeholder:text-texte-attenue focus:border-primaire focus:outline-none focus:ring-2 focus:ring-primaire/30"
          aria-label="Message"
        />
        <Bouton type="submit" enCours={envoiEnCours} disabled={!contenu.trim()}>
          Envoyer
        </Bouton>
      </form>
    </div>
  );
}

function MessageBulles({
  message,
  estMoi,
  nomAuteur,
}: {
  message: MessageDomaine;
  estMoi: boolean;
  nomAuteur: string;
}): React.JSX.Element {
  const heure = new Date(message.dateCreation).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={estMoi ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          estMoi
            ? "max-w-[75%] rounded-2xl rounded-br-sm bg-primaire px-4 py-2.5 text-fond"
            : "max-w-[75%] rounded-2xl rounded-bl-sm bg-fond-surface-claire px-4 py-2.5 text-texte"
        }
      >
        {!estMoi && (
          <p className="mb-0.5 text-xs font-semibold text-secondaire">{nomAuteur}</p>
        )}
        <p className="text-sm">{message.contenu}</p>
        <p
          className={
            estMoi
              ? "mt-1 text-right text-[10px] text-fond/60"
              : "mt-1 text-right text-[10px] text-texte-attenue"
          }
        >
          {heure}
        </p>
      </div>
    </div>
  );
}
