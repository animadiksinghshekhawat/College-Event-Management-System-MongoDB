const $ = id => document.getElementById(id);
const state = { events: [], participants: [], registrations: [], feedback: [] };

async function api(url, options={}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}
const get = url => api(url);
const send = (url, method, data) => api(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
const escapeHTML = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function showMessage(text,error=false){
  const el=$("message"); el.textContent=text; el.className="message"+(error?" error":"");
  setTimeout(()=>el.classList.add("hidden"),3000);
}


async function loadAnalytics(){
  try{
    const [summary,eventData,ratingData,participantData]=await Promise.all([
      get("/api/analytics/summary"),
      get("/api/analytics/event-registrations"),
      get("/api/analytics/event-ratings"),
      get("/api/analytics/participant-registrations")
    ]);
    $("aggTotalRegistrations").textContent=summary.registrations.totalRegistrations||0;
    $("aggEventsWithRegistrations").textContent=summary.registrations.eventsWithRegistrations||0;
    $("aggAvgRegistrations").textContent=Number(summary.registrations.averageRegistrationsPerEvent||0).toFixed(1);
    $("aggAvgRating").textContent=Number(summary.feedback.averageRating||0).toFixed(1)+" ⭐";

    $("eventAnalytics").innerHTML=eventData.length?`
      <table class="mini-table"><thead><tr><th>Event</th><th>Registrations</th></tr></thead>
      <tbody>${eventData.map(x=>`<tr><td>${escapeHTML(x.name)}</td><td><b>${x.registrationCount}</b></td></tr>`).join("")}</tbody></table>`
      :'<div class="empty">No event registration data.</div>';

    $("ratingAnalytics").innerHTML=ratingData.length?`
      <table class="mini-table"><thead><tr><th>Event</th><th>Rating</th><th>Reviews</th></tr></thead>
      <tbody>${ratingData.map(x=>`<tr><td>${escapeHTML(x.name)}</td><td>${Number(x.averageRating||0).toFixed(2)} ⭐</td><td>${x.feedbackCount}</td></tr>`).join("")}</tbody></table>`
      :'<div class="empty">No feedback data.</div>';

    $("participantAnalytics").innerHTML=participantData.length?`
      <table class="mini-table"><thead><tr><th>Participant</th><th>Course</th><th>Registrations</th></tr></thead>
      <tbody>${participantData.slice(0,10).map(x=>`<tr><td>${escapeHTML(x.name)}</td><td>${escapeHTML(x.course||"-")}</td><td><b>${x.registrationCount}</b></td></tr>`).join("")}</tbody></table>`
      :'<div class="empty">No participant data.</div>';
  }catch(e){showMessage(e.message,true)}
}

async function load(){
  try{
    const [events,participants,registrations,feedback,stats]=await Promise.all([
      get("/api/events"),get("/api/participants"),get("/api/registrations"),get("/api/feedback"),get("/api/stats")
    ]);
    Object.assign(state,{events,participants,registrations,feedback});
    $("eventsCount").textContent=stats.events;
    $("participantsCount").textContent=stats.participants;
    $("registrationsCount").textContent=stats.registrations;
    $("feedbackCount").textContent=stats.feedback;
    $("averageRating").textContent=Number(stats.averageRating||0).toFixed(1);
    fillSelects(); render(); loadAnalytics();
  }catch(e){showMessage(e.message,true)}
}

function fillSelects(){
  const eventOptions='<option value="">Select event</option>'+state.events.map(e=>`<option value="${e._id}">${escapeHTML(e.name)}</option>`).join("");
  const participantOptions='<option value="">Select participant</option>'+state.participants.map(p=>`<option value="${p._id}">${escapeHTML(p.name)}</option>`).join("");
  ["eventSelect","feedbackEvent"].forEach(id=>$(id).innerHTML=eventOptions);
  ["participantSelect","feedbackParticipant"].forEach(id=>$(id).innerHTML=participantOptions);
}

function render(){
  const eq=($("eventSearch").value||"").toLowerCase();
  const pq=($("participantSearch").value||"").toLowerCase();
  const events=state.events.filter(e=>(e.name+" "+e.venue+" "+e.description).toLowerCase().includes(eq));
  const participants=state.participants.filter(p=>(p.name+" "+p.email+" "+p.course).toLowerCase().includes(pq));

  $("eventList").innerHTML=events.length?events.map(e=>`
    <div class="item"><div class="item-main"><b>${escapeHTML(e.name)}</b>
    <div class="meta">📅 ${escapeHTML(e.date)} &nbsp; • &nbsp; 📍 ${escapeHTML(e.venue)}</div>
    <div class="description">${escapeHTML(e.description||"No description")}</div></div>
    <div class="actions"><button class="btn-edit" onclick="editEvent('${e._id}')">Edit</button><button class="btn-delete" onclick="deleteEvent('${e._id}')">Delete</button></div></div>`).join(""):'<div class="empty">No events found.</div>';

  $("participantList").innerHTML=participants.length?participants.map(p=>`
    <div class="item"><div class="item-main"><b>${escapeHTML(p.name)}</b>
    <div class="meta">✉ ${escapeHTML(p.email)} ${p.phone?` • ☎ ${escapeHTML(p.phone)}`:""} ${p.course?` • 🎓 ${escapeHTML(p.course)}`:""}</div></div>
    <div class="actions"><button class="btn-edit" onclick="editParticipant('${p._id}')">Edit</button><button class="btn-delete" onclick="deleteParticipant('${p._id}')">Delete</button></div></div>`).join(""):'<div class="empty">No participants found.</div>';

  $("registrationList").innerHTML=state.registrations.length?state.registrations.map(r=>`
    <div class="item"><div class="item-main"><b>${escapeHTML(r.participantId?.name||"Deleted participant")}</b>
    <div class="meta">Registered for: ${escapeHTML(r.eventId?.name||"Deleted event")}</div></div>
    <div class="actions"><button class="btn-delete" onclick="deleteRegistration('${r._id}')">Remove</button></div></div>`).join(""):'<div class="empty">No registrations yet.</div>';

  $("feedbackList").innerHTML=state.feedback.length?state.feedback.map(f=>`
    <div class="item"><div class="item-main"><b>${"⭐".repeat(Number(f.rating)||0)} (${f.rating}/5)</b>
    <div class="meta">${escapeHTML(f.participantId?.name||"Unknown")} • ${escapeHTML(f.eventId?.name||"Unknown event")}</div>
    <div class="description">${escapeHTML(f.comment||"No comment")}</div></div>
    <div class="actions"><button class="btn-delete" onclick="deleteFeedback('${f._id}')">Delete</button></div></div>`).join(""):'<div class="empty">No feedback yet.</div>';
}

$("eventForm").onsubmit=async e=>{e.preventDefault();try{await send("/api/events","POST",Object.fromEntries(new FormData(e.target)));e.target.reset();showMessage("Event added successfully");load()}catch(x){showMessage(x.message,true)}};
$("participantForm").onsubmit=async e=>{e.preventDefault();try{await send("/api/participants","POST",Object.fromEntries(new FormData(e.target)));e.target.reset();showMessage("Participant added successfully");load()}catch(x){showMessage(x.message,true)}};
$("registrationForm").onsubmit=async e=>{e.preventDefault();try{await send("/api/registrations","POST",Object.fromEntries(new FormData(e.target)));e.target.reset();showMessage("Registration successful");load()}catch(x){showMessage(x.message,true)}};
$("feedbackForm").onsubmit=async e=>{e.preventDefault();try{const d=Object.fromEntries(new FormData(e.target));d.rating=Number(d.rating);await send("/api/feedback","POST",d);e.target.reset();showMessage("Feedback submitted");load()}catch(x){showMessage(x.message,true)}};
$("eventSearch").oninput=render;
$("participantSearch").oninput=render;

async function deleteEvent(id){if(!confirm("Delete this event and its registrations/feedback?"))return;try{await api("/api/events/"+id,{method:"DELETE"});showMessage("Event deleted");load()}catch(e){showMessage(e.message,true)}}
async function deleteParticipant(id){if(!confirm("Delete this participant and related registrations/feedback?"))return;try{await api("/api/participants/"+id,{method:"DELETE"});showMessage("Participant deleted");load()}catch(e){showMessage(e.message,true)}}
async function deleteRegistration(id){if(!confirm("Remove this registration?"))return;try{await api("/api/registrations/"+id,{method:"DELETE"});showMessage("Registration removed");load()}catch(e){showMessage(e.message,true)}}
async function deleteFeedback(id){if(!confirm("Delete this feedback?"))return;try{await api("/api/feedback/"+id,{method:"DELETE"});showMessage("Feedback deleted");load()}catch(e){showMessage(e.message,true)}}

function editEvent(id){
  const e=state.events.find(x=>x._id===id);
  openModal("EDIT EVENT","Edit Event",`
    <input name="name" value="${escapeHTML(e.name)}" placeholder="Event name" required>
    <div class="form-row"><input name="date" type="date" value="${escapeHTML(e.date)}" required><input name="venue" value="${escapeHTML(e.venue)}" placeholder="Venue" required></div>
    <textarea name="description" placeholder="Description">${escapeHTML(e.description)}</textarea>
    <button class="primary">Save Changes</button>`);
  $("editForm").onsubmit=async ev=>{ev.preventDefault();try{await send("/api/events/"+id,"PUT",Object.fromEntries(new FormData(ev.target)));closeModal();showMessage("Event updated successfully");load()}catch(x){showMessage(x.message,true)}};
}
function editParticipant(id){
  const p=state.participants.find(x=>x._id===id);
  openModal("EDIT PARTICIPANT","Edit Participant",`
    <input name="name" value="${escapeHTML(p.name)}" placeholder="Full name" required>
    <input name="email" type="email" value="${escapeHTML(p.email)}" placeholder="Email" required>
    <div class="form-row"><input name="phone" value="${escapeHTML(p.phone)}" placeholder="Phone"><input name="course" value="${escapeHTML(p.course)}" placeholder="Course"></div>
    <button class="primary">Save Changes</button>`);
  $("editForm").onsubmit=async ev=>{ev.preventDefault();try{await send("/api/participants/"+id,"PUT",Object.fromEntries(new FormData(ev.target)));closeModal();showMessage("Participant updated successfully");load()}catch(x){showMessage(x.message,true)}};
}
function openModal(label,title,body){$("modalLabel").textContent=label;$("modalTitle").textContent=title;$("editForm").innerHTML=body;$("editModal").classList.remove("hidden")}
function closeModal(){$("editModal").classList.add("hidden")}
$("editModal").onclick=e=>{if(e.target.id==="editModal")closeModal()};

load();
