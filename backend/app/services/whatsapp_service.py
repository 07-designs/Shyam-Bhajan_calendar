import logging
from datetime import datetime
from typing import Optional, Dict, Any
from twilio.rest import Client
from app.config import settings

# Configure structured Python logging for WhatsApp service
logger = logging.getLogger("whatsapp_service")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)


class WhatsAppService:
    """
    Production-grade WhatsApp Notification Service encapsulating Twilio SDK.
    Provides reusable methods for text messaging and formatted booking alerts.
    Designed to easily scale for multiple recipients, customer confirmations, and fallbacks.
    """

    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_WHATSAPP_FROM
        self.admin_number = settings.ADMIN_WHATSAPP_NUMBER
        self.admin_panel_url = settings.ADMIN_PANEL_URL

    def _get_client(self) -> Optional[Client]:
        """
        Private helper to instantiate and return Twilio client if credentials are configured.
        """
        if self.account_sid and self.auth_token:
            return Client(self.account_sid, self.auth_token)
        return None

    def send_text_message(self, to_number: str, body: str) -> Optional[str]:
        """
        Send a raw text WhatsApp message to a specified recipient.
        
        :param to_number: Recipient number in 'whatsapp:+1234567890' format.
        :param body: String text content to deliver.
        :return: Twilio message SID string if successfully dispatched, None otherwise.
        """
        logger.info(f"WhatsApp notification started for recipient: {to_number}")

        if not all([self.account_sid, self.auth_token, self.from_number]):
            logger.warning("Twilio credentials incomplete in config. Skipping message dispatch.")
            return None

        try:
            client = self._get_client()
            if not client:
                logger.error("Failed to instantiate Twilio client instance.")
                return None

            message = client.messages.create(
                body=body,
                from_=self.from_number,
                to=to_number
            )

            logger.info(
                f"WhatsApp notification success | Recipient: {to_number} | Twilio SID: {message.sid}"
            )
            return message.sid

        except Exception as e:
            logger.error(f"WhatsApp notification failure | Recipient: {to_number} | Error: {str(e)}", exc_info=True)
            return None

    def send_booking_notification(self, booking_data: Dict[str, Any]) -> bool:
        """
        Format and send a structured booking request alert to admin WhatsApp recipients.
        
        :param booking_data: Dictionary containing booking details (full_name, phone, address, booking_date, notes).
        :return: True if notification dispatches successfully, False on error.
        """
        try:
            name = booking_data.get("full_name", "N/A")
            phone = booking_data.get("phone", "N/A")
            address = booking_data.get("address", "N/A")
            booking_date = booking_data.get("booking_date", "N/A")
            notes = booking_data.get("notes", "None") or "None"
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")

            # Clean devotional message formatting
            formatted_body = (
                f"🙏 *JAI SHREE SHYAM* 🙏\n\n"
                f"*New Bhajan Booking Request*\n\n"
                f"👤 *Name:* {name}\n"
                f"📞 *Phone:* {phone}\n"
                f"📅 *Preferred Date:* {booking_date}\n"
                f"📍 *Address:* {address}\n"
                f"📝 *Notes:* {notes}\n\n"
                f"🔗 *Admin Panel:* {self.admin_panel_url}\n"
                f"⏰ *Booking Timestamp:* {timestamp}"
            )

            recipients = settings.admin_whatsapp_numbers
            if not recipients:
                logger.warning("ADMIN_WHATSAPP_NUMBER not configured. Message fallback:\n" + formatted_body)
                return False

            success_count = 0
            for recipient in recipients:
                sid = self.send_text_message(to_number=recipient, body=formatted_body)
                if sid:
                    success_count += 1

            return success_count > 0

        except Exception as e:
            logger.error(f"Failed to format/send booking notification | Error: {str(e)}", exc_info=True)
            return False


# Singleton instance of WhatsAppService for service layer reuse
whatsapp_service = WhatsAppService()


def send_booking_notification_task(booking_data: Dict[str, Any]) -> None:
    """
    Background task worker function invoked via FastAPI BackgroundTasks.
    Isolates notification execution so request-response cycle completes instantly.
    """
    whatsapp_service.send_booking_notification(booking_data)
