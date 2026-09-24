// ==UserScript==
// @name         Pathbuilder Español
// @namespace    https://github.com/kulltrumpet/Pathbuilder-Espanol
// @version      1.00.00
// @description  Pathbuilder traducido a español
// @author       Kull Trumpet

// @match        https://2e.aonprd.com/*
// @match        https://pathbuilder2e.com/*
// @noframes

// @exclude      *://docs.google.com/*
// @exclude      *://drive.google.com/*
// @exclude      *://mail.google.com/*

// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @require      https://gist.githubusercontent.com/BrockA/2625891/raw/9c97aa67ff9c5d56be34a55ad6c18a314e5eb548/waitForKeyElements.js

// @licence      CC-BY-NC-SA-4.0; https://creativecommons.org/licenses/by-nc-sa/4.0/
// @licence      GPL-3.0-or-later; http://www.gnu.org/licenses/gpl-3.0.txt
// ==/UserScript==
/* jshint esversion: 6 */

(function () {
    'use strict';

    if(0){/*
last update: 7/04/2020

== todo ==
1. comment on iframes.
1. script execution flow with FHD.
1. separate counter for each execution instance.

10. case: 2 text nodes have the same parent block.

== issues ==
- certain text nodes aren't accessed with markCheckedElement enabled. (multiple text nodes)

== how it works ==
1a. calls processPage() once for each major run.
1b. creates list of specific text nodes then checks each against all rules.
1ba. with special replace enabled, if delete or full replace match, check stops after the first special match.
- this excludes elements previously checked.
- changes text based on matches.
1c. after checking a text node against all rules, applies a 'checked' class to the element containing the text node.

2a. dlt1 and dlt2 completely replaces text by default, option to change.

== notification notes ==
1e. elements checked by title attributes are processed in a separate block.
5a. notifications only work for those sites enabled with filters.

== version history ==
== 1.05.03 ==
- custom execution time
- some clean up.

== code markers ==
AA. initial setup
AB. replace rules
AC. special rules
BA. script options
BB. notif code block
CA. processPage()
CB. execution control
DA. script button
DB. support functions
    */}

    // ==== AA. initial setup =====================================================================|

    const scriptPrefix = "rplt-";
    const scriptTag = "RPLT";

    let runScript = 1;
    runScript = getOptionState("enable-"+ scriptPrefix +"script", runScript);

    if (runScript) {

        let enableConsoleMessages = 1; // default 0; set to 1 to show console messages.
        enableConsoleMessages = getOptionState("log-"+ scriptPrefix +"msg", enableConsoleMessages);

        let enabledMessages =
            //"MA|"+ // any rule matches
            "TT-MA|"+ // page title match.
            "TXT-MA|"+ // all text matches.
            "DLT1|"+ // delete1 matches.
            "DLT2|"+ // delete2 matches
            "FR1|"+ // full replace matches.
            //"CH-TT|"+ // changed text.

            "RUNT|"+ // runtime messages (amount of time to execute)
            "EXEC|"+ // execution messages (when code is executed)
            "\\bST\\b|"+ //script option change update
            "GEN$|"+ // general messages
            "^1"; // high priority messages
        let logAll = 0; // if 1, logs all titles from blocks.
        logAll = getOptionState("log-"+ scriptPrefix +"all", logAll);
        if (logAll) {
            enabledMessages = enabledMessages.concat("|title");
        }
        const enabledMessagesRegex = new RegExp(enabledMessages); // used in consolelog().

        consolelog("#### ("+ scriptTag +") text replace script began. ####", "EXEC");

        // ==== AB. replace rules =================================================================|

        // base rules for replacement
        let replaceRules = [
            //[//i, ""], // rule template

            // basic examples:
            //[/commit/i, "dog"],
            //[/branch/i, "turtle"],
            //[/file/i, "birdie"],
            //[/\w/g, "a"], //replaces all characters with "a".
            //[/(.|\W)+/i, "text"], //replaces all text instances with "text".

            // shield descriptions (must be here due to shield description text not being in listview-detail for some reason)
            [/Like wooden shields, steel shields come in a variety of shapes and sizes\. Though more expensive than wooden shields, they are much more durable\./i, "Como los escudos de madera, los de acero se construyen en una gran variedad de formas y tamaños. Aunque más caros que los de madera, son mucho más duraderos."],
            [/Though they come in a variety of shapes and sizes, the protection offered by wooden shields comes from the stoutness of their materials\. While wooden shields are less expensive than steel shields, they break more easily\./i, "Aunque hay una gran variedad de formas y tamaños, la protección ofrecida por los escudos de madera procede de la reciedumbre de sus materiales. Si bien los escudos de madera son más baratos que los de acero, se rompen con más facilidad."],
            [/These massive shields can be used to provide cover to nearly the entire body\. Due to their size, they are typically made of wood reinforced with metal\. Getting the higher bonus for a tower shield requires using the Take Cover action while the shield is raised\./i, "Estos enormes escudos se pueden utilizar para proporcionar cobertura a casi todo el cuerpo. Debido a su tamaño, suelen ser de madera reforzada con metal."],
            [/This very small shield is a favorite of duelists and quick, lightly armored warriors\. It's typically made of steel and strapped to your forearm\. You can Raise a Shield with your buckler as long as you have that hand free or are holding a light object that's not a weapon in that hand\./i, "Este escudo, muy pequeño, es el favorito de los duelistas y de los guerreros rápidos y provistos de armadura ligera. Típicamente está hecho de acero y va atado a tu antebrazo. Puedes Alzar un escudo con tu rodela si tienes libre dicha mano o sostienes en la misma un objeto ligero distinto de un arma."],

            // weapon trait descriptions
            [/This weapon can be wielded with two hands\. Doing so changes its weapon damage die to the indicated value\. This change applies to all the weapon's damage dice, such as those from striking runes\./i, "Esta arma se puede empuñar con ambas manos para cambiar su dado de daño al valor indicado. Este cambio se aplica a todos los dados de daño del arma."],
            [/The multiple attack penalty you take with this weapon on the second attack on your turn is -4 instead of -5, and -8 instead of -10 on the third and subsequent attacks in the turn\./i, "El penalizador por ataque múltiple que sufres con esta arma en el segundo ataque de tu turno es -4 en lugar de -5, y -8 en lugar de -10 en el tercer ataque y subsiguientes del turno."],
            [/Natural attacks with this trait can be used to attack creatures up to the listed distance away instead of only adjacent creatures\.Weapons with this trait are long and can be used to attack creatures up to 10 feet away instead of only adjacent creatures\. For creatures that already have reach with the limb or limbs that wield the weapon, the weapon increases their reach by 5 feet\./i, "Esta arma se puede utilizar para atacar a enemigos que están hasta 10 pies (3 m) de distancia en lugar de sólo a enemigos adyacentes. Para las criaturas con alcance, el arma incrementa en 5 pies (1,5 m) su alcance."],
            [/You can throw this weapon as a ranged attack, and it is a ranged weapon when thrown\. A thrown weapon adds your Strength modifier to damage just like a melee weapon does\. When this trait appears on a melee weapon, it also includes the range increment\. Ranged weapons with this trait use the range increment specified in the weapon's Range entry\./i, "Puedes arrojar esta arma como un ataque a distancia; cuando se arroja se convierte en una arma a distancia. Sumas tu modificador por Fuerza al daño como harías en un arma cuerpo a cuerpo. Cuando este rasgo aparece en un arma cuerpo a cuerpo, también incluye el incremento de rango de distancia. Las armas a distancia con este rasgo utilizan el incremento de rango de distancia que aparece en la entrada Rango de distancia del arma."],
            [/This weapon makes wide sweeping or spinning attacks, making it easier to attack multiple enemies\. When you attack with this weapon, you gain a \+1 circumstance bonus to your attack roll if you already attempted to attack a different target this turn using this weapon\./i, "Esta arma lleva a cabo ataques de barrido o de giro. Cuando atacas con esta arma, obtienes un bonificador +1 por circunstancia a tu tirada de ataque si ya has intentado atacar a un objetivo diferente este turno utilizándola."],
            [/You can use this weapon to Trip with the Athletics skill even if you don't have a free hand\. This uses the weapon's reach \(if different from your own\) and adds the weapon's item bonus to attack rolls as an item bonus to the Athletics check\. If you critically fail a check to Trip using the weapon, you can drop the weapon to take the effects of a failure instead of a critical failure\./i, "Puedes utilizar esta arma para Derribar con la habilidad Atletismo, incluso si no tienes una mano libre. Esto utiliza el alcance del arma (si es distinto del tuyo) y suma el bonificador por objeto de la misma a las tiradas de ataque como un bonificador por objeto a la prueba de Atletismo. Si sufres un fallo critico en una prueba de Derribar utilizando el arma, puedes dejarla caer para sufrir los efectos de un fallo en lugar de los de un fallo crítico."],
            [/This weapon can be used to Trip with the Athletics skill at a distance up to the weapon's first range increment\. The skill check takes a -2 circumstance penalty\. You can add the weapon's item bonus to attack rolls as a bonus to the check\. As with using a melee weapon to trip, a ranged trip doesn't deal any damage when used to Trip\. This trait usually appears only on a thrown weapon\./i, "El arma puede utilizarse para Derribar con la habilidad Atletismo dentro del primer incremento de rango de distancia del arma. La prueba de habilidad sufre un penalizador -2 por circunstancia. Puedes sumar el modificador por objeto del arma a las tiradas de ataque como bonificador a la prueba. Un arma de derribo a distancia no inflige daño alguno cuando se utiliza para Derribar. Estas armas son por lo general arrojadizas."],
            [/You can use this weapon to Disarm with the Athletics skill even if you don't have a free hand\. This uses the weapon's reach \(if different from your own\) and adds the weapon's item bonus to attack rolls \(if any\) as an item bonus to the Athletics check\. If you critically fail a check to Disarm using the weapon, you can drop the weapon to take the effects of a failure instead of a critical failure\. On a critical success, you still need a free hand if you want to take the item\./i, "Puedes utilizar esta arma para Desarmar con la habilidad Atletismo incluso si no tienes una mano libre. Esto utiliza el alcance del arma (si es distinto del tuyo) y suma el bonificador por objeto de la misma (si lo hay) a las tiradas de ataque como bonificador por objeto a la prueba de Atletismo. Si sufres un fallo crítico en una prueba de Desarmar utilizando el arma, puedes dejarla caer para sufrir los efectos de un fallo en lugar de los de un fallo crítico. Con un éxito crítico, sigues necesitando una mano libre si quieres recuperar el objeto."],
            [/You can use this weapon to Shove with the Athletics skill even if you don't have a free hand\. This uses the weapon's reach \(if different from your own\) and adds the weapon's item bonus to attack rolls as an item bonus to the Athletics check\. If you critically fail a check to Shove using the weapon, you can drop the weapon to take the effects of a failure instead of a critical failure\./i, "Puedes utilizar esta arma para Empujar con la habilidad Atletismo, incluso si no tienes una mano libre. Esto utiliza el alcance del arma (si es distinto del tuyo) y suma el bonificador por objeto de la misma a las tiradas de ataque como un bonificador por objeto a la prueba de Atletismo. Si sufres un fallo critico en una prueba de Empujar utilizando el arma, puedes dejarla caer para sufrir los efectos de un fallo en lugar de los de un fallo crítico."],
            [/The fatal trait includes a die size\. On a critical hit, the weapon's damage die increases to that die size instead of the normal die size, and the weapon adds one additional damage die of the listed size\./i, "El rasgo fatal incluye un tamaño de dado. Con un impacto crítico, el dado de daño de arma se incrementa a dicho tamaño en lugar del tamaño de dado normal, y el arma suma un dado de daño adicional del tamaño indicado."],
            [/An attached weapon must be combined with another piece of gear to be used\. The trait lists what type of item the weapon must be attached to\. You must be wielding or wearing the item the weapon is attached to in order to attack with it\. For example, shield spikes are attached to a shield, allowing you to attack with the spikes instead of a shield bash, but only if you're wielding the shield\. An attached weapon is usually bolted onto or built into the item it's attached to, and typically an item can have only one weapon attached to it\. Typically the weapon can’t be used if the item it’s attached to is broken\. An attached weapon can be affixed to an item with 10 minutes of work and a successful DC 10 Crafting check; this includes the time needed to remove the weapon from a previous item, if necessary\. If an item is destroyed, its attached weapon can usually be salvaged\./i, "Una arma fijada debe combinarse con otra pieza de equipo para poderse usar. El rasgo indica a qué tipo de objeto se tiene que fijar el arma. Debes estar empuñando o llevando puesto el objeto al que el arma está fijada para atacar con ella. Por ejemplo, las púas de un escudo están fijadas al mismo, lo que te permite atacar con ellas en lugar de golpear con el escudo. Un arma fijada está por lo general atornillada al objeto o construida en el mismo, y típicamente un objeto sólo puede tener un arma fijada. Un arma fijada se puede fijar al objeto con 10 minutos de trabajo y una prueba con éxito de Artesanía CD 10; esto incluye el tiempo necesario para quitar el arma de un objeto previo, si es necesario. Si el objeto queda destruido, su arma fijada suele poderse recuperar."],
            [/These weapons are used as a pair, complementing each other\. When you attack with a twin weapon, you add a circumstance bonus to the damage roll equal to the weapon's number of damage dice if you have previously attacked with a different weapon of the same type this turn\. The weapons must be of the same type to benefit from this trait, but they don't need to have the same runes\./i, "Estas armas se utilizan por parejas. Cuando atacas con un arma gemela, sumas un bonificador por circunstancia a la tirada de daño igual al número de dados de daño del arma si ya has atacado previamente con otra arma del mismo tipo este turno. Las armas deben ser del mismo tipo, pero no hace falta que tengan las mismas runas."],
            [/The weapon is suited for mounted combat with a harness or similar means\. When mounted, if you moved at least 10 feet on the action before your attack, add a circumstance bonus to damage for that attack equal to the number of damage dice for the weapon\. In addition, while mounted, you can wield the weapon in one hand, changing the damage die to the listed value\./i, "El arma es adecuada para el combate montado, mediante un arnés o medio similar. Cuando vas montado, si has movido por lo menos 10 pies (3 m) en la acción anterior a tu ataque, suma al daño un bonificador por circunstancia para dicho ataque igual al número de dados de daño para el arma. Además, cuando vas montado puedes empuñar el arma a una mano, cambiando el dado de daño al valor indicado. Como parte de tu acción de Montar a una criatura, puedes cambiar tu agarre de una arma de justa a una mano. Después, cambiar el agarre requiere de la acción de Interactuar. Si desmontas mientras empuñas una arma de justa a una mano, puedes cambiar a usarla a dos manos como parte de dicha acción si en ese momento tienes una mano libre. Si no, estarás sosteniendo el arma en una mano, pero no empuñándola."],
            [/On a critical hit, the weapon adds a weapon damage die of the listed size\. Roll this after doubling the weapon's damage\. This increases to two dice if the weapon has a greater striking rune and three dice if the weapon has a major striking rune\. For instance, a rapier with a greater striking rune deals 2d8 extra piercing damage on a critical hit\. An ability that changes the size of the weapon's normal damage dice doesn't change the size of its deadly die\./i, "En un impacto crítico, el arma añade un dado de daño de arma del tamaño indicado. Haz esta tirada después de doblar el daño. Esto se incrementa a dos dados si el arma tiene una runa de golpe mayor y a tres dados si tiene una runa de golpe superior. Por ejemplo, una espada ropera con una runa de golpe mayor inflige 2d8 daño perforante adicional con un impacto crítico. Una aptitud que cambia el tamaño del dado de daño normal del arma no cambia el tamaño de su dado letal."],
            [/This weapon doesn't take up your hand, usually because it is built into your armor\. A free-hand weapon can't be Disarmed\. You can use the hand covered by your free-hand weapon to wield other items, perform manipulate actions, and so on\. You can't attack with a free-hand weapon if you're wielding anything in that hand or otherwise using that hand\. When you're not wielding anything and not otherwise using the hand, you can use abilities that require you to have a hand free as well as those that require you to be wielding a weapon in that hand\. Each of your hands can have only one free-hand weapon on it\./i, "Esta arma no ocupa tu mano, por lo general debido a estar incorporada a tu armadura. No se te puede desarmar de un arma de mano libre. Puedes utilizar la mano cubierta por tu arma de mano libre para empuñar otros objetos, llevar a cabo acciones de manipular, etc. No puedes atacar con un arma de mano libre si empuñas otra cosa con esa mano o la estás usando para otra cosa. Cuando no empuñas nada y no estás usando la mano para otra cosa, puedes utilizar aptitudes que requieren tener una mano libre, así como las que requieren que estés empuñando un arma en esa mano. Sólo puedes tener un arma de mano libre en cada una de tus manos."],
            [/Abilities with this trait are from the monk class\. A weapon with this trait is primarily used by monks\./i, "Aptitudes con este rasgo son de la clase monje. Un arma con este rasgo es usado primariamente por los monjes."],
            [/Attacks with this weapon are nonlethal, and are used to knock creatures unconscious instead of kill them\. You can use a nonlethal weapon to make a lethal attack with a -2 circumstance penalty\./i, "Los ataques con esta arma no son letales y se utilizan para dejar a las criaturas inconscientes en lugar de matarlas. Puedes utilizar un arma no letal para llevar a cabo un ataque letal con un penalizador -2 por circunstancia."],
            [/This weapon is designed to be inconspicuous or easily concealed\. You gain a \+2 circumstance bonus to Stealth checks and DCs to hide or conceal a weapon with this trait\./i, "Esta arma está diseñada para ser discreta o fácilmente ocultada. Obtienes un bonificador + 2 por circunstancia a las pruebas de Sigilo y a las CD para esconder u ocultar un arma con este rasgo."],
            [/This weapon can be used defensively to block attacks\. While wielding this weapon, if your proficiency with it is trained or better, you can spend a single action to position your weapon defensively, gaining a \+1 circumstance bonus to AC until the start of your next turn\./i, "Esta arma se puede utilizar defensivamente para bloquear ataques. Cuando empuñas esta arma, si tu competencia con ella es entrenado o mejor, puedes invertir una acción para colocar tu arma de forma defensiva, obteniendo un bonificador +1 por circunstancia a la CA hasta el inicio de tu siguiente turno."],
            [/You can use this weapon to Grapple with the Athletics skill even if you don't have a free hand\. This uses the weapon's reach \(if different from your own\) and adds the weapon's item bonus to attack rolls as an item bonus to the Athletics check\. If you critically fail a check to Grapple using the weapon, you can drop the weapon to take the effects of a failure instead of a critical failure\./i, "Puedes utilizar esta arma para Agarrar con la habilidad Atletismo, incluso si no tienes una mano libre. Esto utiliza el alcance del arma (si es distinto del tuyo) y suma el bonificador por objeto de la misma a las tiradas de ataque como un bonificador por objeto a la prueba de Atletismo. Si sufres un fallo critico en una prueba de Apresar utilizando el arma, puedes dejarla caer para sufrir los efectos de un fallo en lugar de los de un fallo crítico."],
            [/You add half your Strength modifier \(if positive\) to damage rolls with a propulsive ranged weapon\. If you have a negative Strength modifier, you add your full Strength modifier instead\./i, "Sumas la mitad de tu modificador por Fuerza (si es positivo) a las tiradas de daño con una arma a distancia propulsiva. Si tienes un modificador por Fuerza negativo, en su lugar sumas tu modificador por Fuerza completo."],
            [/When you hit a flat-footed creature, this weapon deals 1 precision damage in addition to its normal damage\. The precision damage increases to 2 if the weapon is a \+3 weapon\./i, "Cuando aciertas a una criatura desprevenida, esta arma inflige 1 daño de precisión además de su daño normal. El daño de precisión se incrementa a 2 si el arma es un arma +3."],
            [/You can use the momentum from a missed attack with this weapon to lead into your next attack\. After missing with this weapon on your turn, you gain a \+1 circumstance bonus to your next attack with this weapon before the end of your turn\./i, "Puedes utilizar el impulso de un ataque fallido con esta arma para iniciar tu siguiente ataque. Tras fallar con esta arma en tu turno, obtienes un bonificador +1 por circunstancia a tu siguiente ataque con la misma antes del final de tu turno."],
            [/An unarmed attack uses your body rather than a manufactured weapon\. An unarmed attack isn't a weapon, though it's categorized with weapons for weapon groups, and it might have weapon traits\. Since it's part of your body, an unarmed attack can't be Disarmed\. It also doesn't take up a hand, though a fist or other grasping appendage generally works like a free-hand weapon\./i, "Un ataque sin armas utiliza tu cuerpo en lugar de un arma fabricada. Un ataque sin armas no es un arma, aunque pertenece a un grupo de armas y podría tener rasgos de arma. Un ataque sin armas no puede ser Desarmado. Tampoco ocupa una mano, aunque un puño u otro apéndice capaz de aferrar sigue las mismas reglas que un arma de mano libre."],
            [/You can use your Dexterity modifier instead of your Strength modifier on attack rolls using this melee weapon\. You still use your Strength modifier when calculating damage\./i, "Puedes utilizar tu modificador por Destreza en lugar de tu modificador por Fuerza en las tiradas de ataque utilizando esta arma cuerpo a cuerpo. Sigues utilizando la Fuerza para calcular el daño."],
            [/A versatile weapon can be used to deal a different type of damage than that listed in the Damage entry\. This trait indicates the alternate damage type\. For instance, a piercing weapon that is versatile S can be used to deal piercing or slashing damage\. You choose the damage type each time you make an attack\./i, "Un arma versátil se puede utilizar para infligir un tipo de daño diferente al indicado. Este rasgo indica el tipo de daño alternativo. Por ejemplo, un arma perforante con versátil Cor puede infligir daño perforante o cortante. Tú eliges el tipo de daño cada vez que atacas."],
            [/This weapon becomes more dangerous as you build momentum\. When you attack with it more than once on your turn, the second attack gains a circumstance bonus to damage equal to the number of weapon damage dice, and each subsequent attack gains a circumstance bonus to damage equal to double the number of weapon damage dice\./i, "Esta arma se hace más peligrosa conforme más impulso acumulas. Cuando atacas con ella más de una vez en tu turno, el segundo ataque obtiene un bonificador por circunstancia al daño igual al número de dados de daño de arma y cada ataque posterior obtiene un bonificador por circunstancia al daño igual al doble del número de dados de daño."],
            [/This ranged weapon is less effective at close distances\. Your attacks against targets that are at a distance within the range listed take a -2 penalty\./i, "Este ataque a distancia es menos efectivo a corta distancia. Tus ataques contra objetivos que están a una distancia dentro del incremento de rango indicado sufren un penalizador -2."],

            // critical specialization
            [/If the target of the critical hit is adjacent to a surface, it gets stuck to that surface by the missile\. The target is immobilized and must spend an Interact action to attempt a DC 10 Athletics check to pull the missile free; it can't move from its space until it succeeds\. The creature doesn't become stuck if it is incorporeal, is liquid \(like a water elemental or some oozes\), or could otherwise escape without effort\./i, "Si el objetivo del impacto crítico está adyacente a una superficie, se queda clavado a la misma por el proyectil. El objetivo queda inmovilizado y debe invertir una acción de Interactuar para hacer una prueba de Atletismo CD 10 y arrancar el proyectil; hasta que lo consiga no se podrá mover de su espacio. La criatura no se queda clavada si es incorporal, líquida o de alguna otra forma podría escapar sin esfuerzo (como por ejemplo siendo lo suficientemente grande como para que el proyectil no fuera un impedimento)."],
            [/The target is moved 5 feet in a direction of your choice\. This is forced movement\./i, "El objetivo es movido 5 pies (1,5 m) en una dirección elegida por ti. Éste es un movimiento forzado."],
            [/The target takes 1d8 persistent bleed damage\. You gain an item bonus to this bleed damage equal to the weapon’s item bonus to attack rolls\./i, "El objetivo sufre 1d8 daño persistente por sangrado. Obtienes un bonificador por objeto a este daño por sangrado igual al bonificador por objeto del arma a las tiradas de ataque."],
            [/Increase the radius of the bomb’s splash damage \(if any\) to 10 feet\./i, "Incrementa a 10 pies (3 m) el radio del daño por salpicadura de la bomba (si lo hay)."],
            [/You knock the target away from you up to 10 feet \(you choose the distance\)\. This is forced movement\./i, "Apartas de ti de un golpe al objetivo hasta 10 pies (3 m) en línea recta, eligiendo tú la dirección. Éste es un movimiento forzado."],
            [/The target takes 1d6 persistent bleed damage\. You gain an item bonus to this bleed damage equal to the weapon’s item bonus to attack rolls\./i, "El objetivo sufre 1d6 daño persistente por sangrado. Obtienes un bonificador por objeto a este daño por sangrado igual al bonificador por objeto del arma a las tiradas de ataque."],
            [/You knock the target back from you 5 feet\. This is forced movement\./i, "Apartas de ti de un empujón al objetivo 5 pies (1,5 m). Éste es un movimiento forzado."],
            [/The target is made off-balance by your attack, becoming off-guard until the start of your next turn\./i, "El objetivo queda desequilibrado por tu ataque, quedando desprevenido hasta el inicio de tu siguiente turno."],
            [/Choose one creature adjacent to the initial target and within reach\. If its AC is lower than your attack roll for the critical hit, you deal damage to that creature equal to a roll of your weapon’s damage die \(including extra dice for its striking rune, if any\)\. No bonuses or other additional dice apply to this damage\./i, "Elige una criatura adyacente al objetivo inicial y dentro del alcance. Si su CA es menor que el resultado de tu tirada de ataque para el impacto crítico, inflige tanto daño a dicha criatura como el resultado del dado de daño de arma que tiraste (incluyendo los dados adicionales por su runa de golpe, si hubiera). Esta cantidad no se dobla, ni se aplican bonificadores ni otros dados adicionales a este daño."],
            [/The target must succeed at a Fortitude save against your class DC or be stunned 1\./i, "El objetivo ha de tener éxito en una salvación de Fortaleza contra tu CD de clase o quedar aturdido 1."],
            [/The weapon pierces the target, weakening its attacks\. The target is clumsy 1 until the start of your next turn\./i, "Las armas de este grupo atraviesan al objetivo, debilitando sus ataques. Éste queda torpe 1 hasta el inicio de tu siguiente turno."],
            [/The target is knocked prone unless they succeed at a Reflex save against your class DC\./i, "El objetivo queda tumbado hasta que tiene éxito en una salvación de Reflejos contra tu CD de clase."],
            [/The target is knocked prone unless they succeed at a Fortitude save against your class DC\./i, "El objetivo queda tumbado hasta que tiene éxito en una salvación de Fortaleza contra tu CD de clase."],
            [/The target must succeed at a Fortitude save against your class DC or be slowed 1 until the end of your next turn\./i, "El objetivo debe tener éxito en una salvación de Fortaleza contra tu CD de clase o quedar lentificado 1 hasta el final de tu siguiente turno."],
            [/The weapon viciously pierces the target, who takes 2 additional damage per weapon damage die\./i, "El arma atraviesa cruelmente el objetivo, que sufre 2 daño adicional por dado de daño de arma."],

            // armor trait descriptions
            [/The armor covers you so completely that it provides benefits against some damaging effects\. On Reflex saves to avoid a damaging effect, such as a fireball, you add a \+3 modifier instead of your Dexterity modifier\./i, "La armadura te cubre de forma tan completa que te proporciona beneficios contra algunos efectos dañinos. A las salvaciones de Reflejos para evitar un efecto dañino, como por ejemplo una bola de fuego, sumas un modificador +3 en lugar de tu modificador por Destreza."],
            [/The armor is so comfortable that you can rest normally while wearing it\./i, "La armadura es tan cómoda que puedes descansar con normalidad mientras la llevas."],
            [/The armor is flexible enough that it doesn't hinder most actions\. You don't apply its check penalty to Acrobatics or Athletics checks\./i, "La armadura es tan flexible que no obstaculiza la mayoría de acciones. No aplicarás su penalizador a las pruebas en las de Acrobacias o Atletismo."],
            [/This armor is loud and likely to alert others to your presence\. The armor's check penalty applies to Stealth checks even if you meet the required Strength score\./i, "Esta armadura rechina y es probable que alerte a otros de tu presencia. El penalizador por armadura a las pruebas se aplica a las de Sigilo, incluso si tienes el modificador por Fuerza requerido."],

            // armor specialization
            [/The numerous overlapping pieces of this armor protect you from piercing attacks\. You gain resistance to piercing damage equal to 1 \+ the value of the armor’s potency rune for medium armor, or 2 \+ the value of the armor’s potency rune for heavy armor\./i, "Las numerosas piezas superpuestas de esta armadura te protegen de los ataques perforantes. Obtienes una resistencia al daño perforante igual a 1 + el valor de la runa de potencia de la armadura para las armaduras intermedias o 2 + el valor de la runa de potencia de la armadura para las armaduras pesadas."],
            [/The armor is so flexible it can bend with a critical hit and absorb some of the blow\. Reduce the damage from critical hits by either 4 \+ the value of the armor’s potency rune for medium armor, or 6 \+ the value of the armor’s potency rune for heavy armor\. This can’t reduce the damage to less than the damage rolled for the hit before doubling for a critical hit\./i, "La armadura se puede doblar con un impacto crítico y absorber parte del golpe. Reduce el daño procedente de los impactos críticos en 4 + el valor de la runa de potencia de la armadura para las armaduras intermedias o 6 + el valor de la runa de potencia de la armadura para las armaduras pesadas. Esto no puede reducir el daño a menos del obtenido para el impacto antes de doblarlo para un crítico."],
            [/The sturdy plate provides no purchase for a cutting edge\. You gain resistance to slashing damage equal to 1 \+ the value of the armor’s potency rune for medium armor, or 2 \+ the value of the armor’s potency rune for heavy armor\./i, "Las recias placas no proporcionan agarre alguno a un filo cortante. Obtienes una resistencia al daño cortante igual a 1 + el valor de la runa de potencia de la armadura para las armaduras intermedias o 2 + el valor de la runa de potencia de la armadura para las armaduras pesadas."],
            [/The thick second skin of the armor disperses blunt force to reduce bludgeoning damage\. You gain resistance to bludgeoning damage equal to 1 \+ the value of the armor’s potency rune for medium armor, or 2 \+ the value of the armor’s potency rune for heavy armor\./i, "La gruesa segunda piel de la armadura dispersa la fuerza bruta para reducir el daño contundente. Obtienes una resistencia al daño contundente igual a 1 + el valor de la runa de potencia de la armadura para las armaduras intermedias o 2 + el valor de la runa de potencia de la armadura para las armaduras pesadas."],

            // heritage descriptions

            // ancestry feature descriptions
            [/You can see in dim light as though it were bright light, and you ignore the concealed condition due to dim light\./, "Puedes ver en luz tenue como si fuera luz brillante, por lo que ignoras el estado oculto debido a la luz tenue."],
            [/You can see in darkness and dim light just as well as you can see in bright light, though your vision in darkness is in black and white\./, "Puedes ver en la oscuridad y en luz tenue igual de bien que con luz brillante, aunque tu visión en la oscuridad es en blanco y negro."],
            [/You get one clan dagger for free, as it was given to you at birth\. Selling this clan dagger is a terrible taboo and earns you the disdain of other dwarves\./, "Obtienes una daga de clan gratis, que te fue regalada cuando naciste. Vender esta daga de clan es un tabú terrible y te podría granjear el desdén de otros enanos."],
            [/Your eyes are sharp, allowing you to make out small details about concealed or even invisible creatures that others might miss\. You gain a \+2 circumstance bonus when using the Seek action to find hidden or undetected creatures within 30 feet of you\. When you target an opponent that is concealed from you or hidden from you, reduce the DC of the flat check to 3 for a concealed target or 9 for a hidden one\./, "Tu vista es aguda, permitiéndote distinguir pequeños detalles acerca de criaturas ocultas o incluso invisibles, que otros podrían pasar por alto. Obtienes un bonificador +2 por circunstancia al utilizar la acción de Buscar para encontrar criaturas escondidas o no detectadas a 30 pies (9 m) o menos de ti. Cuando designas como objetivo a un oponente que está oculto o escondido de ti, reduce la CD de la prueba plana a un 3 para un objetivo oculto o a 9 para uno escondido."],
            [/\bYou gain nourishment in the same way that the plants or fungi that match your body type normally do, through some combination of photosynthesis, absorbing minerals with your roots, or scavenging decaying matter\. You typically do not need to pay for food\. If you normally rely on photosynthesis and go without sunlight for 1 week, you begin to starve\. You can derive nourishment from specially formulated bottles of sunlight instead of natural sunlight, but these bottles cost 10 times as much as standard rations \(or 40 sp\)\./i, "Te nutres de la misma forma que las plantas o los hongos que encajan con tu tipo de cuerpo, mediante alguna combinación de fotosíntesis, absorbiendo minerales con tus raíces o forrajeando materia orgánica en descomposición. Lo normal es que no tengas que pagar por la comida. Si sueles basarte en la fotosíntesis y pasas 1 semana aislado de la luz del sol, empiezas a pasar hambre. Tu sustento puede provenir de unas botellas especialmente formuladas de luz solar en lugar de la luz natural, pero estas botellas cuestan 10 veces más que las raciones estándar (es decir, unas 40 pp)."],

            // various Pathbuilder text
            [/\bHide Plan\b/, "Ocultar plan"],
            [/\bShow Plan\b/, "Mostrar plan"],
            [/\bAlert!/i, "¡Alerta!"],
            [/\bEquipment Information\b/i, "Información sobre el equipo"],
            [/\bInformation\b/i, "Información"],
            [/\bContainer Options\b/i, "Opciones de recipiente"],
            [/Really delete this weapon\?/i, "¿Realmente quieres borrar esta arma?"],
            [/Really stow this weapon to the gear tab\?/i, "¿Realmente quieres guardar esta arma en la pestaña 'Equipo'?"],
            [/Really stow this armor to the gear tab\?/i, "¿Realmente quieres guardar esta armadura en la pestaña 'Equipo'?"],
            [/Really remove this shield from your character\?/i, "¿Realmente quieres quitar este escudo de tu personaje?"],
            [/Really stow your shield to the gear tab\?/i, "¿Realmente quieres guardar tu escudo en la pestaña 'Equipo'?"],
            [/Really restore this item to the armor or weapon tab\?/i, "¿Realmente quieres restaurar este objeto a la pestaña 'Defensa' o 'Armas'?"],
            [/Really swap this item with/i, "¿Realmente quieres intercambiar este objeto por"],
            [/currently equipped/i, "actualmente llevado"],
            [/Really remove/i, "¿Realmente quieres quitar"],
            [/from your equipment\?/i, "de tu equipo?"],
            [/from your formula list\?/i, "de tu lista de fórmulas?"],
            [/Animal Companions, Eidolons, Constructs and Familiars are gained from feats and class features\. You do not have an Animal Companion, Eidolon or Familiar at this level\./i, "Los compañeros animales, ídolos, constructos y familiares se obtiene por dotes y rasgos de clase. En este nivel no tienes compañero animal, ídolo o familiar."],
            [/Animal Companions, Eidolons, Constructs and Familiars are only available in the fully unlocked version of this app\./i, "Los compañeros animales, ídolos, constructos y familiares solo son disponibles en la versión desbloqueada de esta app."],

            // individual words/terms

            [/\bAlchemical Bomb\b/, "Bomba alquímica"],
            [/\bArbalest\b/, "Arbalesta"],
            [/\bArrows\b/, "Flechas"],
            [/\bBastard Sword\b/, "Espada bastarda"],
            [/\bBattle Axe\b/, "Hacha de batalla"],
            [/\bBlowgun\b/, "Cerbatana"],
            [/\bBo Staff\b/, "Bastón bo"],
            [/\bBola\b/, "Boleadoras"],
            [/\bBolts\b/, "Virotes"],
            [/\bClan Dagger\b/, "Daga de clan"],
            [/\bComposite Longbow\b/, "Arco largo compuesto"],
            [/\bComposite Shortbow\b/, "Arco corto compuesto"],
            [/\bOrc Knuckle Dagger\b/, "Daga orca de nudillos"],
            [/\bDagger\b/, "Daga"],
            [/\bDogslicer\b/, "Rajaperros"],
            [/\bDwarven War Axe\b/, "Hacha de guerra enana"],
            [/\bElven Curve Blade\b/, "Espada curva elfa"],
            [/\bFalchion\b/, "Alfanje"],
            [/\bFilcher's Fork\b/, "Tenedor de afanar"],
            [/\bFist\b/, "Puño"],
            [/\bSpiked Gauntlet\b/, "Guantelete armado"],
            [/\bGauntlet\b/, "Guantelete"],
            [/\bGlaive\b/, "Guja"],
            [/\bGnome Flickmace\b/, "Maza de giro gnoma"],
            [/\bGnome Hooked Hammer\b/, "Martillo ganchudo gnomo"],
            [/\bGreataxe\b/, "Gran hacha"],
            [/\bGreatclub\b/, "Gran clava"],
            [/\bGreatpick\b/, "Gran pico"],
            [/\bGreatsword\b/, "Mandoble"],
            [/\bGuisarme\b/, "Bisarma"],
            [/\bHalberd\b/, "Alabarda"],
            [/\bHalfling Sling Staff\b/, "Bastón honda mediano"],
            [/\bHand Crossbow\b/, "Ballesta de mano"],
            [/\bHatchet\b/, "Hacha de mano"],
            [/\bHeavy Crossbow\b/, "Ballesta pesada"],
            [/\bHorsechopper\b/, "Sajacaballos"],
            [/\bJavelin\b/, "Jabalina"],
            [/\bLance\b/, "Lanza de caballería"],
            [/\bLight Hammer\b/, "Martillo ligero"],
            [/\bLight Mace\b/, "Maza ligera"],
            [/\bLight Pick\b/, "Pico ligero"],
            [/\bLongbow\b/, "Arco largo"],
            [/\bLongspear\b/, "Lanza larga"],
            [/\bLongsword\b/, "Espada larga"],
            [/\bMace\b/, "Maza"],
            [/\bMain-gauche\b/, "Daga de guardamano"],
            [/\bMaul\b/, "Mazo"],
            [/\bMorningstar\b/, "Maza de armas"],
            [/\bOrc Necksplitter\b/, "Partecuellos orco"],
            [/\bRanseur\b/, "Ronca"],
            [/\bRapier\b/, "Espada ropera"],
            [/\bSap\b/, "Cachiporra"],
            [/\bSawtooth Saber\b/, "Sable aserrado"],
            [/\bScimitar\b/, "Cimitarra"],
            [/\bScythe\b/, "Guadaña"],
            [/\bSeedpod\b/, "Tegumento"],
            [/\bShield Bash\b/, "Golpe con el escudo"],
            [/\bShield Boss\b/, "Umbo de escudo"],
            [/\bShield Spikes\b/, "Púas de escudo"],
            [/\bShortbow\b/, "Arco corto"],
            [/\bShortsword\b/, "Espada corta"],
            [/\bSickle\b/, "Hoz"],
            [/\bSling Bullets\b/, "Balas de honda"],
            [/\bSpiked Chain\b/, "Cadena armada"],
            [/\bStaff\b/, "Bastón"],
            [/\bStarknife\b/, "Cuchillo de estrella"],
            [/\bTemple Sword\b/, "Espada del templo"],
            [/\bTrident\b/, "Tridente"],
            [/\bWar Flail\b/, "Mangual de guerra"],
            [/\bWarhammer\b/, "Martillo de guerra"],
            [/\bWhip\b/, "Látigo"],

            [/\bExplorer's Clothing\b/, "Ropa de explorador"],
            [/\bChain Shirt\b/, "Camisote de malla"],
            [/\bStudded Leather\b/, "Cuero tachonado"],
            [/\bLeather\b/, "Cuero"],
            [/\bPadded Armor\b/, "Ropa acolchada"],
            [/\bBreastplate\b/, "Coraza"],
            [/\bScale Mail\b/, "Cota de escamas"],
            [/\bChain Mail\b/, "Cota de malla"],
            [/\bHide\b/, "Pieles"],
            [/\bFull Plate\b/, "Armadura completa"],
            [/\bSplint Mail\b/, "Armadura laminada"],
            [/\bHalf Plate\b/, "Placas y mallas"],

            [/\bCloth\b/, "Ropa"],
            [/\bPlate\b/, "Placas"],
            [/\bComposite\b/, "Compuesto"],

            [/\bSteel Shield\b/, "Escudo de acero"],
            [/\bWooden Shield\b/, "Escudo de madera"],
            [/\bTower Shield\b/, "Escudo pavés"],
            [/\bBuckler\b/, "Rodela"],

            [/\bBackpack\b/, "Mochila"],
            [/\bCaltrops\b/, "Abrojos"],
            [/\bOil\b/, "Aceite (1 pinta [0,5l])"],
            [/\bSaddlebags\b/, "Alforjas"],
            [/\bTorch\b/, "Antorcha"],
            [/\bTack\b/, "Arreos"],
            [/\bMerchant's Scale\b/, "Balanza de mercader"],
            [/\bCompass \(Lensatic\)/, "Brújula (lente y dial)"],
            [/\bCompass\b/, "Brújula"],
            [/\bChain\b/, "Cadena (10 pies [3m])"],
            [/\bDueling Cape\b/, "Capa de duelo"],
            [/\bSpyglass \(Fine\)/, "Catalejo (gran calidad)"],
            [/\bSpyglass\b/, "Catalejo"],
            [/\bLock \(Poor\)/, "Cerradura barata"],
            [/\bLock \(Simple\)/, "Cerradura sencilla"],
            [/\bLock \(Average\)/, "Cerradura normal"],
            [/\bLock \(Good\)/, "Cerradura buena"],
            [/\bLock \(Superior\)/, "Cerradura superior"],
            [/\bChest\b/, "Cofre"],
            [/\bRope\b/, "Cuerda (50 pies [15m])"],
            [/\bAdventurer's Pack\b/, "Equipo de aventurero"],
            [/\bRepair Kit \(Superb\)/, "Equipo de reparaciones soberbio"],
            [/\bRepair Kit\b/, "Equipo de reparaciones"],
            [/\bLadder\b/, "Escala (10 pies [3m])"],
            [/\bMirror\b/, "Espejo"],
            [/\bGrappling Hook\b/, "Garfio de abordaje"],
            [/\bManacles \(Poor\)/, "Grilletes baratos"],
            [/\bManacles \(Simple\)/, "Grilletes sencillos"],
            [/\bManacles \(Average\)/, "Grilletes normales"],
            [/\bManacles \(Good\)/, "Grilletes buenos"],
            [/\bManacles \(Superior\)/, "Grilletes superiores"],
            [/\bTool \(Long\)/, "Herramienta larga"],
            [/\bTool \(Short\)/, "Herramienta corta"],
            [/\bMusical Instrument \(Heavy\)/, "Instrumento musical pesado"],
            [/\bMusical Instrument \(Handheld\)/, "Instrumento musical de mano"],
            [/\bMusical Instrument \(Virtuoso Heavy\)/, "Instrumento musical pesado de virtuoso"],
            [/\bMusical Instrument \(Virtuoso Handheld\)/, "Instrumento musical de mano de virtuoso"],
            [/\bSoap\b/, "Jabón"],
            [/\bMug\b/, "Jarra"],
            [/\bAlchemist's Toolkit\b/, "Juego de herramientas de alquimista"],
            [/\bArtisan's Toolkit \(Sterling\)/, "Juego de herramientas de artesano excelentes"],
            [/\bArtisan's Toolkit\b/, "Juego de herramientas de artesano"],
            [/\bThieves' Toolkit \(Infiltrator Picks\)/, "Ganzúas de infiltrador"],
            [/\bThieves' Toolkit \(Replacement Picks\)/, "Ganzúas de repuesto"],
            [/\bThieves' Toolkit \(Infiltrator\)/, "Juego de herramientas de ladrón infiltrador"],
            [/\bThieves' Toolkit\b/, "Juego de herramientas de ladrón"],
            [/\bAlchemist's Lab \(Expanded\)/, "Laboratorio de alquimista mejorado"],
            [/\bAlchemist's Lab\b/, "Laboratorio de alquimista"],
            [/\bBasic Crafter's Book\b/, "Libro básico de artesano"],
            [/\bSpellbook \(Blank\)/, "Libro de conjuros (en blanco)"],
            [/\bFormula Book \(Blank\)/, "Libro de fórmulas (en blanco)"],
            [/\bLantern \(Bull's-Eye\)/, "Linterna de ojo de buey"],
            [/\bLantern \(Hooded\)/, "Linterna sorda"],
            [/\bMagnifying Glass\b/, "Lupa"],
            [/\bCookware\b/, "Material de cocina"],
            [/\bHealer's Toolkit \(Expanded\)/, "Material de curas mejorado"],
            [/\bHealer's Toolkit\b/, "Material de curas"],
            [/\bDetective's Kit\b/, "Material de detective"],
            [/\bDisguise Kit \(Replacement Cosmetics\)/, "Cosméticos de repuesto"],
            [/\bDisguise Kit \(Elite\)/, "Material de disfraz de élite"],
            [/\bDisguise Kit \(Elite Cosmetics\)/, "Cosméticos de élite"],
            [/\bDisguise Kit\b/, "Material de disfraz"],
            [/\bClimbing Kit \(Extreme\)/, "Material de escalada extrema"],
            [/\bClimbing Kit\b/, "Material de escalada"],
            [/\bWriting Set \(Extra Ink and Paper\)/, "Papel y tinta de repuesto"],
            [/\bWriting Set\b/, "Material de escritura"],
            [/\bFishing Tackle \(Professional\)/, "Material de pesca profesiona"],
            [/\bFishing Tackle\b/, "Material de pesca"],
            [/\bWaterskin\b/, "Odre"],
            [/\bBrass Ear\b/, "Oreja de bronce"],
            [/\bCrowbar \(Levered\)/, "Palanqueta reforzada"],
            [/\bCrowbar\b/, "Palanqueta"],
            [/\bFlint and Steel\b/, "Pedernal y yesca"],
            [/\bPeriscope\b/, "Periscopio"],
            [/\bTen-Foot Pole\b/, "Pértiga de 10 pies (3m)"],
            [/\bPiton\b/, "Pitón"],
            [/\bRations\b/, "Raciones"],
            [/\bNet\b/, "Red"],
            [/\bHourglass\b/, "Reloj de arena"],
            [/\bClothing \(Ordinary\)/, "Ropa normal"],
            [/\bClothing \(Explorer's\)/, "Ropa de explorador"],
            [/\bClothing \(Fine\)/, "Ropa de calidad"],
            [/\bClothing \(High-Fashion Fine\)/, "Ropa de calidad y diseño"],
            [/\bClothing \(Cold-weather\)/, "Ropa de invierno"],
            [/\bSack\b/, "Saco"],
            [/\bBedroll\b/, "Saco de dormir"],
            [/\bSignal Whistle\b/, "Silbato de señales"],
            [/\bPrimal Symbol\b/, "Símbolo primigenio"],
            [/\bReligious Symbol \(Wooden\)/, "Símbolo religioso de madera"],
            [/\bReligious Symbol \(Silver\)/, "Símbolo religioso de plata"],
            [/\bReligious Text\b/, "Texto religioso"],
            [/\bTent \(Pup\)/, "Tienda de campaña ratonera"],
            [/\bTent \(Four-Person\)/, "Tienda de campaña para cuatro personas"],
            [/\bTent \(Pavilion\)/, "Tienda de campaña pabellón"],
            [/\bChalk\b/, "Tiza "],
            [/\bParrying Scabbard\b/, "Vaina de parada"],
            [/\bConcealed Sheath\b/, "Vaina oculta"],
            [/\bCandle\b/, "Vela"],
            [/\bScholarly Journal \(Compendium\)/, "Compendio de diarios de erudito"],
            [/\bScholarly Journal\b/, "Diario de erudito"],
            [/\bSurvey Map \(Atlas\)/, "Atlas topográfico"],
            [/\bSurvey Map\b/, "Mapa topográfico"],

            [/\bRest\b/, "Descansar"],
            [/\bAdd Condition\b/, "Añadir Estado"],
            [/\bAdd Custom Buff\b/, "Añadir mejora personalizada"],
            [/\bHero Points\b/, "Puntos de Héroe"],

            [/\bPerception\b/, "Percepción"],
            [/\bInitiative\b/, "Iniciativa"],

            [/\bCritical Success\b/, "Éxito crítico"],
            [/\bSuccess\b/, "Éxito"],
            [/\bCritical Failure\b/, "Fallo crítico"],
            [/\bFailure\b/, "Fallo"],

            [/\bRecovery Checks\b/, "Pruebas de recuperación"],
            [/\bTaking Damage\b/i, "Sufrir daño"],

            [/\bBlinded\b/, "Cegado"],
            [/\bClumsy\b/, "Torpe"],
            [/\bConcealed\b/, "Oculto"],
            [/\bConfused\b/, "Confundido"],
            [/\bControlled\b/, "Controlado"],
            [/\bDazzled\b/, "Deslumbrado"],
            [/\bDeafened\b/, "Ensordecido"],
            [/\bDoomed\b/, "Condenado"],
            [/\bDrained\b/, "Drenado"],
            [/\bDying\b/, "Moribundo"],
            [/\bEncumbered\b/, "Impedido"],
            [/\bEnfeebled\b/, "Debilitado"],
            [/\bFascinated\b/, "Fascinado"],
            [/\bFatigued\b/, "Fatigado"],
            [/\bFleeing\b/, "Huyendo"],
            [/\bFrightened\b/, "Asustado"],
            [/\bGrabbed\b/, "Agarrado"],
            [/\bHidden\b/, "Escondido"],
            [/\bImmobilized\b/, "Inmovilizado"],
            [/\bObserved\b/, "Observado"],
            [/\bOff-guard\b/, "Desprevenido"],
            [/\bParalyzed\b/, "Paralizado"],
            [/\bPersistent Damage\b/, "Daño persistente"],
            [/\bPetrified\b/, "Petrificado"],
            [/\bProne\b/, "Tumbado"],
            [/\bQuickened\b/, "Acelerado"],
            [/\bRestrained\b/, "Neutralizado"],
            [/\bSickened\b/, "Indispuesto"],
            [/\bSlowed\b/, "Lentificado"],
            [/\bStunned\b/, "Aturdido"],
            [/\bStupefied\b/, "Anonadado"],
            [/\bUnconscious\b/, "Inconsciente"],
            [/\bUndetected\b/, "No detectado"],
            [/\bUnnoticed\b/, "Inadvertido"],
            [/\bWounded\b/, "Herido"],

            [/\bBard\b/, "Bardo"],
            [/\bCleric\b/, "Clérigo"],
            [/\bDruid\b/, "Druida"],
            [/\bFighter\b/, "Guerrero"],
            [/\bRanger\b/, "Explorador"],
            [/\bRogue\b/, "Pícaro"],
            [/\bWitch\b/, "Brujo"],
            [/\bWizard\b/, "Mago"],

            [/\bAlchemist\b/, "Alquimista"],
            [/\bBarbarian\b/, "Bárbaro"],
            [/\bChampion\b/, "Campeón"],
            [/\bInvestigator\b/, "Investigador"],
            [/\bMonk\b/, "Monje"],
            [/\bOracle\b/, "Oráculo"],
            [/\bSorcerer\b/, "Hechicero"],
            [/\bSwashbuckler\b/, "Espadachín"],

            [/\bAncient Elf\b/, "Elfo antiguo"],
            [/\bArctic Elf\b/, "Elfo ártico"],
            [/\bCavern Elf\b/, "Elfo de las cavernas"],
            [/\bWhisper Elf\b/, "Elfo de los susurros"],
            [/\bWoodland Elf\b/, "Elfo silvano"],
            [/\bSeer Elf\b/, "Elfo vidente"],
            [/\bForge Dwarf\b/, "Enano de la forja"],
            [/\bRock Dwarf\b/, "Enano de la roca"],
            [/\bAncient-Blooded\b/, "Enano de sangre antigua"],
            [/\bStrong-Blooded Dwarf\b/, "Enano de sangre fuerte"],
            [/\bDeath Warden Dwarf\b/, "Enano guardián de la muerte"],
            [/\bChameleon Gnome\b/, "Gnomo camaleón"],
            [/\bWellspring Gnome\b/, "Gnomo manantial"],
            [/\bSensate Gnome\b/, "Gnomo sensible"],
            [/\bUmbral Gnome\b/, "Gnomo sombrío"],
            [/\bFey-Touched Gnome\b/, "Gnomo tocado por las hadas"],
            [/\bSnow Goblin\b/, "Goblin de la nieve"],
            [/\bRazortooth Goblin\b/, "Goblin dientes afilados"],
            [/\bUnbreakable Goblin\b/, "Goblin irrompible"],
            [/\bCharhide Goblin\b/, "Goblin piel ignífuga"],
            [/\bIrongut Goblin\b/, "Goblin tripas de hierro"],
            [/\bSkilled Human\b/, "Humano hábil"],
            [/\bVersatile Human\b/, "Humano versátil"],
            [/\bGourd Leshy\b/, "Leshy calabaza"],
            [/\bSeaweed Leshy\b/, "Leshy de las algas"],
            [/\bFruit Leshy\b/, "Leshy de las frutas"],
            [/\bLeaf Leshy\b/, "Leshy de las hojas"],
            [/\bRoot Leshy\b/, "Leshy de las raíces"],
            [/\bVine Leshy\b/, "Leshy de las vides"],
            [/\bCactus Leshy\b/, "Leshy de los cactus"],
            [/\bFungus Leshy\b/, "Leshy de los hongos"],
            [/\bLotus Leshy\b/, "Leshy de los lotos"],
            [/\bHillock Halfling\b/, "Mediano con agallas"],
            [/\bGutsy Halfling\b/, "Mediano de las colinas"],
            [/\bWildwood Halfling\b/, "Mediano de las florestas salvajes"],
            [/\bTwilight Halfling\b/, "Mediano del crepúsculo"],
            [/\bJinxed Halfling\b/, "Mediano gafador"],
            [/\bNomadic Halfling\b/, "Mediano nómada"],
            [/\bRainfall Orc\b/, "Orco de la lluvia"],
            [/\bDeep Orc\b/, "Orco de las profundidades"],
            [/\bGrave Orc\b/, "Orco de las sepulturas"],
            [/\bBadlands Orc\b/, "Orco de las tierras baldías"],
            [/\bWinter Orc\b/, "Orco del invierno"],
            [/\bBattle Ready\b/, "Orco listo para la batalla"],
            [/\bHold-Scarred Orc\b/, "Orco marcado por el clan"],
            [/\bNephilim\b/, "Nefilim"],

            [/\bAll Ancestries\b/, "Todas ascendencias"],
            [/\bAncestry\b/, "Ascendencia"],
            [/\bHumanoid\b/, "Humanoide"],
            [/\bDwarf\b/, "Enano"],
            [/\bElf\b/, "Elfo"],
            [/\bGnome\b/, "Gnomo"],
            [/\bHalfling\b/, "Mediano"],
            [/\bHuman\b/, "Humano"],
            [/\bOrc\b/, "Orco"],

            [/\bBackground\b/, "Bagaje"],
            [/\bAcolyte\b/, "Acólito"],
            [/\bAcrobat\b/, "Acróbata"],
            [/\bFortune Teller\b/, "Adivino"],
            [/\bEntertainer\b/, "Animador"],
            [/\bArtisan\b/, "Artesano"],
            [/\bArtist\b/, "Artista"],
            [/\bBandit\b/, "Bandido"],
            [/\bBarkeep\b/, "Barman"],
            [/\bScout\b/, "Batidor"],
            [/\bLaborer\b/, "Bracero"],
            [/\bBounty Hunter\b/, "Cazarrecompensas"],
            [/\bHunter\b/, "Cazador"],
            [/\bBarrister\b/, "Letrado"],
            [/\bCharlatan\b/, "Charlatán"],
            [/\bCook\b/, "Cocinero"],
            [/\bWarrior\b/, "Combatiente"],
            [/\bRaised by Belief\b/, "Criado por la fe"],
            [/\bCriminal\b/, "Delincuente"],
            [/\bMartial Disciple\b/, "Discípulo marcial"],
            [/\bEmissary\b/, "Emisario"],
            [/\bHermit\b/, "Ermitaño"],
            [/\bScholar\b/, "Erudito"],
            [/\bGladiator\b/, "Gladiador"],
            [/\bStreet Urchin\b/, "Golfillo"],
            [/\bGuard\b/, "Guardia"],
            [/\bHerbalist\b/, "Herbolario"],
            [/\bGambler\b/, "Jugador"],
            [/\bFarmhand\b/, "Labrador"],
            [/\bBarrister\b/, "Letrado"],
            [/\bTeacher\b/, "Maestro"],
            [/\bTinker\b/, "Manitas"],
            [/\bSailor\b/, "Marino"],
            [/\bField Medic\b/, "Médico de campaña"],
            [/\bMerchant\b/, "Mercader"],
            [/\bMiner\b/, "Minero"],
            [/\bNomad\b/, "Nómada"],
            [/\bPrisoner\b/, "Preso"],
            [/\bCultist\b/, "Sectario"],
            [/\bAnimal Whisperer\b/, "Susurrador de animales"],

            [/\bKEY ABILITY\b/, "ATRIBUTO CLAVE"],
            [/\bPERCEPTION\b/, "PERCEPCIÓN"],
            [/\bSAVING THROWS\b/, "TIRADAS DE SALVACIÓN"],
            [/\bSKILLS\b/, "HABILIDADES"],
            [/\bATTACKS\b/, "ATAQUES"],
            [/\bDEFENSES\b/, "DEFENSAS"],
            [/\bCLASS DC\b/, "CD DE CLASE"],
            [/\bSPELLS\b/, "CONJUROS"],

            [/\bABILITY BOOSTS AND FLAWS\b/, "MEJORAS Y DEFECTOS DE ATRIBUTO"],
            [/\bTwo free Ability Boosts\b/, "Dos mejoras de atributo gratuitas"],
            [/\bBoosts\b/, "Mejoras"],
            [/\bFlaw\b/, "Defecto"],

            [/\bLANGUAGES\b/, "IDIOMAS"],

            [/\bSPECIAL\b/, "ESPECIAL"],
            [/\bLow-Light Vision\b/, "Visión en la penumbra"],
            [/\bDarkvision\b/, "Visión en la oscuridad"],
            [/\bKeen Eyes\b/, "Buen ojo"],
            [/\bPlant Nourishment\b/, "Nutrición de planta"],

            [/\bAcrobatics\b/, "Acrobacias"],
            [/\bArcana\b/, "Arcanos"],
            [/\bAthletics\b/, "Atletismo"],
            [/\bCrafting\b/, "Artesanía"],
            [/\bDeception\b/, "Engaño"],
            [/\bDiplomacy\b/, "Diplomacia"],
            [/\bIntimidation\b/, "Intimidación"],
            [/\bLore\b/, "Saber"],
            [/\bMedicine\b/, "Medicina"],
            [/\bNature\b/, "Naturaleza"],
            [/\bOccultism\b/, "Ocultismo"],
            [/\bPerformance\b/, "Interpretación"],
            [/\bReligion\b/, "Religión"],
            [/\bSociety\b/, "Sociedad"],
            [/\bStealth\b/, "Sigilo"],
            [/\bSurvival\b/, "Supervivencia"],
            [/\bThievery\b/, "Latrocinio"],

            [/\bDemon\b/, "Demonio"],
            [/\bHag\b/, "Saga"],

            // common Lore categories
            [/\bAcademia\b/, "Académico"],
            [/\bAccounting\b/, "Contabilidad"],
            [/\bArchitecture\b/, "Arquitectura"],
            [/\bArt\b/, "Arte"],
            [/\bAstronomy\b/, "Astronomía"],
            [/\bBardic\b/, "Bárdico"],
            [/\bCarpentry\b/, "Carpintería"],
            [/\bCircus\b/, "Circo"],
            [/\bCooking\b/, "Cocinar"],
            [/\bDriving\b/, "Conducir"],
            [/\bEngineering\b/, "Ingeniería"],
            [/\bFarming\b/, "Agricultura"],
            [/\bFishing\b/, "Pesca"],
            [/\bFortune-Telling\b/, "Buenaventura"],
            [/\bGames\b/, "Juegos"],
            [/\bGenealogy\b/, "Genealogía"],
            [/\bGladiatorial\b/, "Gladiadores"],
            [/\bGuild\b/, "Gremio"],
            [/\bHeraldry\b/, "Heráldica"],
            [/\bHerbalism\b/, "Herboristería"],
            [/\bHunting\b/, "Caza"],
            [/\bLabor\b/, "Trabajo"],
            [/\bLibrary\b/, "Bibliotecas"],
            [/\bMercantile\b/, "Mercantil"],
            [/\bMidwifery\b/, "Partos"],
            [/\bMilling\b/, "Molienda"],
            [/\bMining\b/, "Minería"],
            [/\bPiloting\b/, "Pilotar"],
            [/\bSailing\b/, "Navegar"],
            [/\bScouting\b/, "Explorar"],
            [/\bScribing\b/, "Escritura"],
            [/\bStabling\b/, "Establos"],
            [/\bTanning\b/, "Curtiduría"],
            [/\bTea\b/, "Té"],
            [/\bTheater\b/, "Teatro"],
            [/\bUnderworld\b/, "Bajos fondos"],
            [/\bWarfare\b/, "Guerra"],

            // These are translated back to English through reverseReplaceRules such that the info modal can open
            [/\bTwo-Hand\b/, "A dos manos"],
            [/\bAgile\b/, "Ágil"],
            [/\bReach\b/, "Alcance"],
            [/\bThrown\b/, "Arrojadiza"],
            [/\bSweep\b/, "Barrido"],
            [/\bRanged Trip\b/, "Derribo a distancia"],
            [/\bTrip\b/, "Derribo"],
            [/\bDisarm\b/, "Desarme"],
            [/\bShove\b/, "Empujón"],
            [/\bAttached to Shield\b/, "Fijado al escudo"],
            [/\bTwin\b/, "Gemela"],
            [/\bJousting\b/, "De justa"],
            [/\bDeadly\b/, "Letal"],
            [/\bFree-Hand\b/, "Mano libre"],
            [/\bNonlethal\b/, "No letal"],
            [/\bGained from Leshy Tegumento feat only\b/, "Obtenido por el dote de leshy Tegumento"],
            [/\bConcealable\b/, "Ocultable"],
            [/\bParry\b/, "Parada"],
            [/\bPropulsive\b/, "De propulsión"],
            [/\bBackstabber\b/, "Puñalada trapera"],
            [/\bBackswing\b/, "Revés"],
            [/\bUnarmed\b/, "Sin armas"],
            [/\bFinesse\b/, "Sutil"],
            [/\bVersatile B\b/, "Versátil Con"],
            [/\bVersatile S\b/, "Versátil Cor"],
            [/\bVersatile P\b/, "Versátil Per"],
            [/\bForceful\b/, "Vigorosa"],
            [/\bVolley\b/, "Volea"],

            [/\bBulwark\b/, "Baluarte"],
            [/\bComfort\b/, "Cómoda"],
            [/\bNoisy\b/, "Ruidosa"],

            [/\bSHIELD\b/, "ESCUDO"],
            [/\bNo Shield\b/, "Sin escudo"],
            [/Armor Class/i, "Clase de armadura"],
            [/\bRaise\b/, "Alzar"],
            [/\bRaised\b/, "Alzado"],
            [/\bHardness\b/, "Dureza"],
            [/\bBroken\b/, "Roto"],
            [/\bBT\b/, "UR"],

            [/\bCircumstance Bonus\b/, "Bonificador por circunstancia"],
            [/\bItem Bonus\b/, "Bonificador por objeto"],
            [/\bStatus Bonus\b/, "Bonificador por estatus"],

            [/\bSimple Weapons\b/, "Armas sencillas"],
            [/\bMartial Weapons\b/, "Armas marciales"],
            [/\bAdvanced Weapons\b/, "Armas avanzadas"],
            [/\bUnarmed Attacks\b/, "Ataques sin armas"],
            [/\bFree\b/, "Gratuita"],
            [/\bAdd Weapon\b/, "Añadir arma"],
            [/\bPrint\b/, "Imprimir"],
            [/\bCritical Specialization\b/, "Especialización crítica"],

            [/\bLight Armor\b/, "Armadura ligera"],
            [/\bMedium Armor\b/, "Armadura intermedia"],
            [/\bHeavy Armor\b/, "Armadura pesada"],
            [/\bUnarmored\b/, "Sin armadura"],
            [/\bItem\b/, "Objeto"],
            [/\bDex Cap\b/, "Tope Des."],
            [/\bAC Bonus\b/, "Bon. CA"],
            [/\bCheck Penalty\b/, "Pen. pruebas"],
            [/\bSpeed Penalty\b/, "Pen. Velocidad"],
            [/\bStow Additional Armor\b/, "Guardar armadura adicional"],
            [/\bStow Additional Shield\b/, "Guardar escudo adicional"],
            [/\bArmor Specialization\b/, "Especialización en armadura"],

            [/\bAdd Gear\b/, "Añadir equipo"],
            [/\bAdd Container\b/, "Añadir recipiente"],
            [/\bAdd Formula\b/, "Añadir fórmula"],
            [/\bMain Inventory\b/i, "Inventario principal"],
            [/\bFormulae\b/i, "Fórmulas"],

            [/\bAxe\b/, "Hacha"],
            [/\bBomb\b/, "Bomba"],
            [/\bBow\b/, "Arcos"],
            [/\bBrawling\b/, "Pelea"],
            [/\bClub\b/, "Clava"],
            [/\bCrossbow\b/, "Ballesta"],
            [/\bDart\b/, "Dardo"],
            [/\bFirearm\b/, "Firearm"],
            [/\bFlail\b/, "Mangual"],
            [/\bHammer\b/, "Martillo"],
            [/\bKnife\b/, "Cuchillo"],
            [/\bPick\b/, "Pico"],
            [/\bPolearm\b/, "De asta"],
            [/\bShield\b/, "Escudo"],
            [/\bSling\b/, "Honda"],
            [/\bSpear\b/, "Lanza"],
            [/\bSword\b/, "Espada"],

            [/\bB, P or S\b/, "Con, Per o Cor"],
            [/(?<=\d\s)B\b/, "Con"],
            [/(?<=\d\s)P\b/, "Per"],
            [/(?<=\d\s)S\b/, "Cor"],
            [/\bPiercing\b/, "Perforante"],
            [/\bSlashing\b/, "Cortante"],
            [/\bBludgeoning\b/, "Contundente"],
            [/\bSpecial\b/, "Especial"],

            [/\bProficiency\b/, "Competencia"],
            [/\bGroup\b/, "Grupo"],
            [/\bPrice\b/, "Precio"],
            [/\bTotal Bulk\b/i, "Impedimenta total"],
            [/\bBulk\b/, "Impedimenta"],
            [/\bEnc\b/i, "Impedido"],
            [/\bUnencumbered\b/i, "No estás impedido"],
            [/\bOver Max\b/i, "Sobre máximo"],
            [/\bMax\b/i, "Máx"],
            [/\bHands\b/, "Manos"],
            [/\bRange\b/, "Rango de distancia"],
            [/\bReload\b/, "Recarga"],
            [/\bAmount\b/, "Cantidad"],
            [/\bQty\b/, "Ctd"],

            [/\bCommon\b/, "Común"],
            [/\bUncommon\b/, "Poco común"],
            [/\bRare\b/, "Raro"],

            [/(?<=\d)\s?pp\b/, "ppt"],
            [/(?<=\d)\s?gp\b/, "po"],
            [/(?<=\d)\s?sp\b/, "pp"],
            [/(?<=\d)\s?cp\b/, "pc"],
            [/\bPlatinum\b/, "Platino"],
            [/\bGold\b/, "Oro"],
            [/\bSilver\b/, "Plata"],
            [/\bCopper\b/, "Cobre"],

            [/\bHP\b/, "PG"],
            [/\bHit Points\b/, "Puntos de golpe"],
            [/\bHIT POINTS\b/, "PUNTOS DE GOLPE"],

            [/\bBuy\b/, "Comprar"],
            [/\bGive\b/, "Darte"],
            [/\bCancel\b/, "Cancelar"],
            [/\bClose\b/, "Cerrar"],
            [/\bFinished\b/, "Listo"],
            [/\bCustom\b/, "Personalizar"],
            [/\bAccept\b/, "Aceptar"],
            [/\bRoll\b/, "Tirar"],
            [/\bOptions\b/, "Opciones"],
            [/\bRunes\b/, "Runas"],
            [/\bStow\b/, "Guardar"],
            [/\bRemove\b/, "Quitar"],
            [/\bDelete\b/, "Borrar"],
            [/\bChange\b/, "Cambiar"],
            [/\bSwap\b/, "Intercambiar"],
            [/\bRestore\b/, "Restaurar"],
            [/\bHit\b/, "Acertar"],
            [/\bDamage\b/, "Daño"],
            [/\bin inventory\b/, "en inventario"],

            [/\bClass\b/, "Clase"],
            [/\bLevel\b/, "Nivel"],
            [/XP/, "PX"],
            [/Character Name/, "Nombre del personaje"],

            [/\bSIZE\b/, "TAMAÑO"],
            [/\bSize\b/, "Tamaño"],
            [/\bTiny\b/, "Menudo"],
            [/\bSmall\b/, "Pequeño"],
            [/\bMedium\b/, "Mediano"],
            [/\bLarge\b/, "Grande"],
            [/\bHuge\b/, "Enorme"],
            [/\bGargantuan\b/, "Gargantuesco"],

            [/\bSPEED\b/, "VELOCIDAD"],
            [/\bSpeed\b/, "Velocidad"],
            [/(?<=\d)\s?ft\./, " pies"],
            [/\bfeet\b/i, "pies"],

            [/\bAC\b/, "CA"],
            [/\bFortitude\b/, "Fortaleza"],
            [/\bReflex\b/, "Reflejos"],
            [/\bWill\b/, "Voluntad"],

            [/\bSTR\b/, "FUE"],
            [/\bDEX\b/, "DES"],
            [/\bWIS\b/, "SAB"],
            [/\bCHA\b/, "CAR"],
            [/\bStr\b/, "Fue"],
            [/\bDex\b/, "Des"],
            [/\bWis\b/, "Sab"],
            [/\bCha\b/, "Car"],
            [/\bStrength\b/, "Fuerza"],
            [/\bDexterity\b/, "Destreza"],
            [/\bConstitution\b/, "Constitución"],
            [/\bIntelligence\b/, "Inteligencia"],
            [/\bWisdom\b/, "Sabiduría"],
            [/\bCharisma\b/, "Carisma"],

            // miscellaneous non-terms
            [/\bor\b/, "o"],
        ];

        // used for traits
        let reverseReplaceRules = [
            [/\bComún\b/, "Common"],
            [/\bPoco común\b/, "Uncommon"],
            [/\bRaro\b/, "Rare"],

            [/\bElfo\b/, "Elf"],
            [/\bEnano\b/, "Dwarf"],
            [/\bHumano\b/, "Human"],
            [/\bHumanoide\b/, "Humanoid"],
            [/\bGnomo\b/, "Gnome"],
            [/\bMediano\b/, "Halfling"],
            [/\bOrco\b/, "Orc"],

            [/\bMonje\b/, "Monk"],

            [/\bA dos manos\b/, "Two-Hand"],
            [/Ágil\b/i, "Agile"],
            [/\bAlcance\b/, "Reach"],
            [/\bArrojadiza\b/, "Thrown"],
            [/\bBarrido\b/, "Sweep"],
            [/\bBallesta\b/, "Crossbow"],
            [/\bDerribo a distancia\b/, "Ranged Trip"],
            [/\bDerribo\b/, "Trip"],
            [/\bDesarme\b/, "Disarm"],
            [/\bEmpujón\b/, "Shove"],
            [/\bFijado\b/, "Attached"],
            [/\bGemela\b/, "Twin"],
            [/\bDe justa\b/, "Jousting"],
            [/\bLetal\b/, "Deadly"],
            [/\bMano libre\b/, "Free-Hand"],
            [/\bNo letal\b/, "Nonlethal"],
            [/\bOcultable\b/, "Concealable"],
            [/\bParada\b/, "Parry"],
            [/\bDe propulsión\b/, "Propulsive"],
            [/\bPuñalada trapera\b/, "Backstabber"],
            [/\bRevés\b/, "Backswing"],
            [/\bSin armas\b/, "Unarmed"],
            [/\bSutil\b/, "Finesse"],
            [/\bVersátil\b/, "Versatile"],
            [/\bVigorosa\b/, "Forceful"],
            [/\bVolea\b/, "Volley"],

            [/\bBaluarte\b/, "Bulwark"],
            [/\bCómoda\b/, "Comfort"],
            [/\bRuidosa\b/, "Noisy"],
        ];

        // specialized rules for optimization and to handle multiple Spanish words for one English word
        let sectionMenuReplaceRules = [
            [/\bCommon\b/, "Común"],
            [/\bUncommon\b/, "Poco común"],
            [/\bRare\b/, "Raro"],
            [/\bAll Ancestries\b/, "Todas ascendencias"],

            [/\bGear\b/, "Equipo"],
            [/\bConsumables\b/, "Consumibles"],
            [/\bMagic Items\b/, "Objetos mágicos"],
            [/\bAdventuring\b/, "De aventura"],
            [/\bAmmunition\b/, "Munición"],
            [/\bWeapon Attachments\b/, "Accesorio de arma"],

            [/\bAll\b/, "Todas"],
            [/\bSimple\b/, "Sencillas"],
            [/\bMartial\b/, "Marciales"],
            [/\bAdvanced\b/, "Avanzadas"],
            [/\bUnarmed\b/, "Sin armas"],
            [/\bProficient\b/, "Competente"],
            [/\bStandard\b/, "Estándares"],
            [/\bMagic\b/, "Mágicas"],
            [/\bCustom\b/, "Personalizadas"],

            [/\bLight\b/, "Ligera"], // due to the spell
            [/\bMedium\b/, "Intermedia"], // due to the size category
            [/\bHeavy\b/, "Pesada"],
        ]

        // descriptions of feats, items, spells, conditions etc.
        let listviewDetailReplaceRules = [

            // ancestry descriptions
            [/Dwarves are a short, stocky people who are often stubborn, fierce, and devoted\./, "Los enanos son un pueblo bajito y fornido, que a menudo es obstinado, fiero y devoto."],
            [/Elves are a tall, long-lived people with a strong tradition of art and magic\./, "Los elfos son un pueblo alto y de larga vida, con una fuerte tradición en el arte y en la magia."],
            [/Gnomes are short and hardy folk, with an unquenchable curiosity and eccentric habits\./, "Los gnomos son un pueblo bajito y recio, con una curiosidad inacabable y hábitos excéntricos."],
            [/Goblins are a short, scrappy, energetic people who have spent millennia maligned and feared\./, "Los goblins son un pueblo bajito, peleón y enérgico que se ha pasado milenios siendo difamado y temido."],
            [/Halflings are a short, resilient people who exhibit remarkable curiosity and humor\./, "Los medianos son un pueblo bajito y resiliente que exhibe una curiosidad y un sentido del humor notables."],
            [/Humans are diverse and adaptable people with wide potential and deep ambitions\./, "Los humanos son un pueblo diverso y adaptable, con un amplio potencial y profundas ambiciones."],
            [/Leshies are immortal nature spirits placed in small plant bodies, seeking to experience the world\./, "Los leshys son espíritus inmortales de la Naturaleza, situados en el cuerpo de plantas pequeñas, que buscan experimentar el mundo."],
            [/Orcs are proud, strong people with hardened physiques who value physical might and glory in combat\./, "Los orcos son un pueblo orgulloso y fuerte, de complexión recia, que valora la potencia física y la gloria en combate."],

            // background descriptions
            [/You spent your early days in a religious monastery or cloister\. You may have traveled out into the world to spread the message of your religion or because you cast away the teachings of your faith, but deep down, you’ll always carry within you the lessons you learned two attribute boosts\. One must be to Intelligence or Wisdom, and one is a free attribute boost\. You’re trained in the Religion skill and the Scribing Lore skill\. You gain the Student of the Canon skill feat\./, "Pasaste tus primeros días en un monasterio o claustro religioso. Puedes haber viajado por todo el mundo para extender el mensaje de tu religión o porque dejaste a un lado las enseñanzas de tu fe, pero en lo más profundo de tu interior siempre llevarás contigo las lecciones que aprendiste. Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Religión y Saber (escritura). Obtienes la dote de habilidad Alumno del canon."],
            [/In a circus or on the streets, you earned your pay by performing as an acrobat\. You might have turned to adventuring when the money dried up, or simply decided to put your skills to better use\./, "En un circo o en las calles, te ganaste el sustento haciendo de acróbata. Podrías haberte decidido por las aventuras cuando se te acabó el dinero o simplemente cuando decidiste dar un uso mejor a tus habilidades."],
            [/Choose two attribute boosts\. One must be to Strength or Dexterity, and one is a free attribute boost\. You’re trained in the Acrobatics skill and the Circus Lore skill\. You gain the Steady Balance skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Destreza, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Acrobacias y Saber (circo). Obtienes la dote de habilidad Equilibrio firme."],
            [/The strands of fate are clear to you, as you have learned many traditional forms by which laypeople can divine the future\. You might have used these skills to guide your community, or simply to make money\. But even the slightest peek into these practices connects you to the occult mysteries of the universe\./, "Las hebras del Destino son claras para ti, puesto que has aprendido muchas de las formas tradicionales por las que los legos pueden adivinar el futuro. Podrías haber utilizado dichas habilidades para guiar a tu comunidad, o simplemente para ganar dinero. Pero incluso el más leve atisbo de estas prácticas te conecta con los misterios ocultos del universo."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Occultism skill and the Fortune-Telling Lore skill\. You gain the Oddity Identification skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Ocultismo y Saber (buenaventura). Obtienes la dote de habilidad Identificación de extrañezas."],
            [/Through an education in the arts or sheer dogged practice, you learned to entertain crowds\. You might have been an actor, a dancer, a musician, a street magician, or any other sort of performer\./, "Gracias a una educación en las artes o bien debido a la práctica persistente, has aprendido a entretener a las multitudes. Puedes haber sido actor, bailarín, músico, mago callejero o cualquier otro tipo de animador."],
            [/Choose two attribute boosts\. One must be to Dexterity or Charisma, and one is a free attribute boost\. You’re trained in the Performance skill and the Theater Lore skill\. You gain the Fascinating Performance skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Interpretar y Saber (teatro). Obtienes la dote de habilidad Interpretación fascinante."],
            [/As an apprentice, you practiced a particular form of building or crafting, developing a specialized skill\. You might have been a blacksmith’s apprentice toiling over the forge for countless hours, a young tailor sewing garments of all kinds, or a shipwright shaping the hulls of ships\./, "Como aprendiz, has practicado una forma particular de construir o de fabricar, desarrollando una habilidad especializada. Podrías haber sido un aprendiz de herrero, trabajando en la forja durante muchas horas, un joven sastre cosiendo ropa de todo tipo o un carpintero naval dando forma al casco de los barcos."],
            [/Choose two attribute boosts\. One must be to Strength or Intelligence, and one is a free attribute boost\. You’re trained in the Crafting skill and the Guild Lore skill\. You gain the Specialty Crafting skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Inteligencia, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Artesanía y Saber (gremio). Obtienes la dote de habilidad Especialidad artesana."],
            [/Your art is your greatest passion, whatever form it takes\. Adventuring might help you find inspiration, or simply be a way to survive until you become a world-famous artist\./, "Tu arte es tu mayor pasión, sea cual sea la forma que adopta. Salir de aventuras te podría ayudar a encontrar la inspiración o simplemente ser la forma de sobrevivir hasta que te conviertas en un artista de fama mundial."],
            [/Choose two attribute boosts\. One must be to Dexterity or Charisma, and one is a free attribute boost\. You’re trained in the Crafting skill and the Art Lore skill\. You gain the Specialty Crafting skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Artesanía y Saber (arte). Obtienes la dote de habilidad Especialidad artesana."],
            [/Your past includes no small amount of rural banditry, robbing travelers on the road and scraping by\. Whether your robbery was sanctioned by a local noble or you did so of your own accord, you eventually got caught up in the adventuring life\./, "Tu pasado incluye una cantidad poco desdeñable de bandidaje rural, robando a los viajeros y sobreviviendo por los pelos. Tanto si tus robos eran sancionados por un noble local o lo hiciste por propia iniciativa, acabaste por integrarte en la vida aventurera."],
            [/Choose two attribute boosts\. One must be to Dexterity or Charisma, and one is a free attribute boost\. You’re trained in the Intimidation skill and a Lore skill related to the terrain you worked in \(such as Desert Lore or Plains Lore\)\. You gain the Group Coercion skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Intimidación y en una habilidad de Saber relacionada con el terreno en el que trabajabas (como Saber [desierto] o Saber [llanuras]). Obtienes la dote de habilidad Intimidación de grupo."],
            [/You have five specialties: hefting barrels, drinking, polishing steins, drinking, and drinking\. You worked in a bar, where you learned how to hold your liquor and rowdily socialize\./, "Tienes cinco especialidades: levantar barriles, beber, pulir jarras, beber y beber. Trabajabas en un bar, donde aprendiste a resistir el licor y a socializar de forma bulliciosa."],
            [/Choose two attribute boosts\. One must be to Constitution or Charisma, and one is a free attribute boost\. You’re trained in the Diplomacy skill and the Alcohol Lore skill\. You gain the Hobnobber skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Diplomacia y Saber (alcohol). Obtienes la dote de habilidad Confraternizador."],
            [/You called the wilderness home as you found trails and guided travelers\. Your wanderlust could have called you to the adventuring life, or perhaps you served as a scout for soldiers and found you liked battle\./, "Las tierras vírgenes eran tu hogar y en ellas encontrabas senderos por los que guiar a los viajeros. Tu ansia viajera te puede haber llevado a la vida de aventurero, o quizás fueras batidor para un ejército y averiguaste que te gustaba la batalla."],
            [/Choose two attribute boosts\. One must be to Dexterity or Wisdom, and one is a free attribute boost\. You’re trained in the Survival skill and a Lore skill related to one terrain you scouted in \(such as Forest Lore or Cavern Lore\)\. You gain the Forager skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Supervivencia y además en una habilidad de Saber relacionada con un terreno por el que guiabas (como por ejemplo Saber [bosques] o Saber [cavernas]). Obtienes la dote de habilidad Forrajeador."],
            [/You’ve spent years performing arduous physical labor\. It was a difficult life, but you somehow survived\. You may have embraced adventuring as an easier method to make your way in the world, or you might adventure under someone else’s command\./, "Has pasado años llevando a cabo trabajos físicos arduos. Era una vida difícil, pero de alguna forma sobreviviste. Puedes haber abrazado las aventuras como forma más fácil de abrirte camino o te podrías aventurar a las órdenes de otro."],
            [/Choose two attribute boosts\. One must be to Strength or Constitution, and one is a free attribute boost\. You’re trained in the Athletics skill and the Labor Lore skill\. You gain the Hefty Hauler skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Constitución, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Atletismo y Saber (trabajo). Obtienes la dote de habilidad Porteador recio."],
            [/You stalked and took down animals and other creatures of the wild\. Skinning animals, harvesting their flesh, and cooking them were also part of your training, all of which can give you useful resources while you adventure\./, "Has perseguido y abatido animales y otras criaturas de las tierras vírgenes. Despellejar animales, preparar su carne y cocinarla formaron también parte de tu aprendizaje, todo lo cual te puede proporcionar recursos útiles al ir de aventuras."],
            [/Choose two attribute boosts\. One must be to Dexterity or Wisdom, and one is a free attribute boost\. You’re trained in the Survival skill and the Tanning Lore skill\. You gain the Survey Wildlife skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Supervivencia y Saber (curtición). Obtienes la dote de habilidad Supervisor de la fauna."],
            [/Bringing in lawbreakers lined your pockets\. Maybe you had an altruistic motive and sought to bring in criminals to make the streets safer, or maybe the coin was motivation enough\. Your techniques for hunting down criminals transfer easily to the life of an adventurer\./, "Llevar ante un tribunal a los prófugos de la ley te llenaba los bolsillos. Quizás lo hacías por un motivo altruista y buscabas encerrar a los delincuentes para que las calles fueran más seguras, o quizás el dinero fuera motivo suficiente. Tus técnicas para perseguir delincuentes son fácilmente transferibles a la vida de un aventurero."],
            [/Choose two attribute boosts\. One must be to Strength or Wisdom, and one is a free attribute boost\. You’re trained in the Survival skill and the Legal Lore skill\. You gain the Experienced Tracker skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Supervivencia y Saber (legal). Obtienes la dote de habilidad Rastreador experto."],
            [/You traveled from place to place, peddling false fortunes and snake oil in one town, while pretending to be royalty in exile to seduce a wealthy heir in the next\. Becoming an adventurer might be your next big scam or an attempt to put your talents to use for a greater cause\. Perhaps it’s a bit of both, as you realize that after pretending to be a hero, you’ve become the mask\./, "Has viajado de un lugar a otro, vendiendo falsos amuletos y aceite de serpiente en una población y pretendiendo pertenecer a la realeza en el exilio para seducir a una rica heredera en la siguiente. Convertirte en aventurero podría ser tu próxima gran estafa o un intento de poner tu talento al servicio de una causa mayor. Quizás es un poco de ambas cosas, puesto que das cuenta de que, después de haber pretendido ser un héroe, te has convertido en una máscara."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Deception skill and the Underworld Lore skill\. You gain the Charming Liar skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Engaño y Saber (bajos fondos). Obtienes la dote de habilidad Mentiroso encantador."],
            [/You grew up in the kitchens of a tavern or other dining establishment and excelled there, becoming an exceptional cook\. Baking, cooking, a little brewing on the side—you’ve spent lots of time out of sight\. It’s about time you went out into the world to catch some sights for yourself\./, "Creciste en la cocina de una taberna u otro establecimiento de comidas y allí llegaste a la excelencia, convirtiéndote en un cocinero excepcional. Horneando, cocinando, y elaborando un poco de cerveza, has pasado mucho tiempo desaparecido. Ya es hora de que salgas al mundo a ver cosas por tu cuenta."],
            [/Choose two attribute boosts\. One must be to Constitution or Intelligence, and one is a free attribute boost\. You’re trained in the Survival skill, and the Cooking Lore skill\. You gain the Seasoned skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Inteligencia, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Supervivencia y Saber (cocina). Obtienes la dote de habilidad Conocedor."],
            [/In your younger days, you waded into battle as a mercenary, a warrior defending a nomadic people, or a member of a militia or army\. You might have wanted to break away from the regimented structure of these forces, or you could have always been as independent a warrior as you are now\./, "En tus años mozos, te adentraste en la batalla como mercenario, combatiente defendiendo a un pueblo nómada, o miembro de una milicia o ejército. Podrías haber querido apartarte de la estructura regimentada de estas fuerzas o podrías haber sido siempre un combatiente independiente como eres ahora."],
            [/Choose two attribute boosts\. One must be to Strength or Constitution, and one is a free attribute boost\. You’re trained in the Intimidation skill and the Warfare Lore skill\. You gain the Intimidating Glare skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Constitución, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Intimidación y Saber (guerra). Obtienes la dote de habilidad Mirada intimidante."],
            [/This background is not available in Pathbuilder 2e\.  Please create a custom background according to your deity\./, "Este bagaje no está disponible en Pathbuilder 2e. Favor de crear un bagaje personalizado según tu dios."],
            [/As an unscrupulous independent or as a member of an underworld organization, you lived a life of crime\. You might have become an adventurer to seek redemption, to escape the law, or simply to get access to bigger and better loot\./, "Como un independiente carente de escrúpulos o como miembro de una organización de los bajos fondos, viviste una vida delictiva. Te podrías haber convertido en aventurero en busca de redención, para huir de la ley o simplemente para tener acceso a más y mejor botín."],
            [/Choose two attribute boosts\. One must be to Dexterity or Intelligence, and one is a free attribute boost\. You’re trained in the Stealth skill and the Underworld Lore skill\. You gain the Experienced Smuggler skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Inteligencia, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Sigilo y Saber (bajos fondos). Obtienes la dote de habilidad Contrabandista experto."],
            [/You solved crimes as a police inspector or took jobs for wealthy clients as a private investigator\. You might have become an adventurer as part of your next big mystery, but likely it was due to the consequences or aftermath of a prior case\./, "Resolviste delitos como inspector de policía o bien aceptaste trabajos de clientes ricos como investigador privado. Podrías haberte convertido en aventurero como parte de tu próximo gran misterio, pero probablemente fuera debido a las consecuencias o al desenlace de un caso anterior."],
            [/Choose two attribute boosts\. One must be to Intelligence or Wisdom, and one is a free attribute boost\. You’re trained in the Society skill and the Underworld Lore skill\. You gain the Streetwise skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Sociedad y Saber (bajos fondos). Obtienes la dote de habilidad Callejeo."],
            [/You dedicated yourself to intense training and rigorous study to become a great warrior\. The school you attended might have been a traditionalist monastery, an elite military academy, or the local branch of a prestigious mercenary organization\./, "Te has dedicado a un entrenamiento intenso y a un estudio riguroso para convertirte en un gran guerrero. La escuela a la que asististe pudo haber sido un monasterio tradicionalista, una academia militar de élite o la rama local de una prestigiosa organización mercenaria."],
            [/Choose two attribute boosts\. One must be to Strength or Dexterity, and one is a free attribute boost\. You’re trained in your choice of the Acrobatics or Athletics skill\. You gain a skill feat: Cat Fall if you chose Acrobatics or Quick Jump if you chose Athletics\. You’re also trained in the Warfare Lore skill\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Destreza, y la otra es una mejora de atributo gratuita. Estás entrenado, a tu elección, en la habilidad Acrobacias o Atletismo. Obtienes una dote de habilidad: Caída de gato si has elegido Acrobacias o Salto veloz si has elegido Atletismo. También estás entrenado en la habilidad Saber (guerra)."],
            [/As a diplomat or messenger, you traveled to lands far and wide\. Communicating with new people and forming alliances were your stock and trade\./, "Como diplomático o mensajero, has viajado por todas partes. Comunicarte con gente nueva y tejer alianzas eran tus puntos fuertes."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Society skill and a Lore skill related to one city you’ve visited often\. You gain the Multilingual skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Sociedad y en una habilidad de Saber relacionada con una ciudad que has visitado a menudo. Obtienes la dote de habilidad Multilingüe."],
            [/In an isolated place—like a cave, remote oasis, or secluded mansion—you lived a life of solitude\. Adventuring might be a welcome reprieve from solitude or an unwanted change, but in either case, you’re likely still rough around the edges\./, "En un lugar aislado, como por ejemplo una cueva, un oasis remoto o una mansión solitaria, llevaste una vida de soledad. Las aventuras podrían representar un alivio temporal a la soledad o un cambio no deseado, pero en cualquier caso, lo más probable es que seas muy poco sofisticado."],
            [/Choose two attribute boosts\. One must be to Constitution or Intelligence, and one is a free attribute boost\. You’re trained in the Nature or Occultism skill, plus a Lore skill related to the terrain you lived in as a hermit \(such as Cave Lore or Desert Lore\)\. You gain the Dubious Knowledge skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Inteligencia, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Naturaleza u Ocultismo, y además una habilidad de Saber relacionada con el terreno en el que viviste como ermitaño (como por ejemplo Saber [cuevas] o Saber [desierto]). Obtienes la dote de habilidad Conocimiento dudoso."],
            [/You have a knack for learning and sequestered yourself from the outside world to learn all you could\. You read about so many wondrous places and things in your books, always dreaming about one day seeing the real things\. Eventually, that curiosity led you to leave your studies and become an adventurer\./, "Se te da muy bien aprender y pasaste mucho tiempo apartado del mundo exterior para aprender todo lo posible. Leíste acerca de tantos lugares y cosas maravillosos en tus libros, que siempre soñaste con verlos algún día en la realidad. Por último, la curiosidad te condujo a abandonar los estudios y convertirte en aventurero."],
            [/Choose two attribute boosts\. One must be to Intelligence or Wisdom, and one is a free attribute boost\. You’re trained in your choice of the Arcana, Nature, Occultism, or Religion skill, and gain the Assurance skill feat in your chosen skill\. You’re also trained in the Academia Lore skill\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado a elegir (una) entre las habilidades Arcanos, Naturaleza, Ocultismo o Religión, y obtienes la dote de habilidad Seguro en la habilidad elegida. También estas entrenado en la habilidad Saber (académico)."],
            [/The bloody games of the arena taught you the art of combat\. Before you attained true fame, you departed—or escaped—the arena to explore the world\. Your skill at drawing both blood and a crowd’s attention pay off in a new adventuring life\./, "Los sangrientos juegos de la arena te enseñaron el arte del combate. Antes de llegar a la verdadera fama te marchaste (o huiste) de la arena para explorar el mundo. Tu habilidad en hacer brotar la sangre y en atraer la atención de una multitud te resultan muy útiles en tu nueva vida de aventuras."],
            [/Choose two attribute boosts\. One must be to Strength or Charisma, and one is a free attribute boost\. You’re trained in the Performance skill and the Gladiatorial Lore skill\. You gain the Impressive Performance skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Interpretar y Saber (gladiadores). Obtienes la dote de habilidad Interpretación impresionante."],
            [/You eked out a living by picking pockets on the streets of a major city, never knowing where you’d find your next meal\. While some adventure for the glory, you do so to survive\./, "Te ganabas (muy poco) la vida vaciando bolsillos en las calles de una gran ciudad, sin saber dónde ibas a encontrar tu siguiente comida. Si bien algunos se van de aventuras en busca de la gloria, tú lo hiciste para sobrevivir."],
            [/Choose two attribute boosts\. One must be to Dexterity or Constitution, and one is a free attribute boost\. You’re trained in Thievery and a Lore skill for the city you lived in as a street urchin \(such as Absalom Lore or Magnimar Lore\)\. You gain the Pickpocket skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Constitución, y la otra es una mejora de atributo gratuita. Estás entrenado en Latrocinio y en una habilidad de Saber relativa a la ciudad en la que viviste como golfillo (como por ejemplo Saber [Absalom] o Saber [Magnimar]). Obtienes la dote de habilidad Carterista."],
            [/You served in the guard, out of either patriotism or the need for coin\. Either way, you know how to get a difficult suspect to talk\. However you left the guard, you might think of adventuring as a way to use your skills on a wider stage\./, "Serviste en la guardia, o bien por patriotismo, o bien por la necesidad de ganarte la vida. De una forma u otra, sabes cómo hacer hablar a un sospechoso difícil. Dejaras la guardia por el motivo que la dejaras, podrías pensar que las aventuras son una forma de utilizar tus habilidades en un escenario mayor."],
            [/Choose two attribute boosts\. One must be to Strength or Charisma, and one is a free attribute boost\. You’re trained in the Intimidation skill and the Legal Lore or Warfare Lore skill\. You gain the Quick Coercion skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Intimidación y Saber (legal) o Saber (guerra). Obtienes la dote de habilidad Intimidación rápida."],
            [/As a formally trained apothecary or a rural practitioner of folk medicine, you learned the healing properties of various herbs\. You’re adept at collecting the right natural cures in all sorts of environments and preparing them properly\./, "Como boticario formalmente entrenado o practicante rural de la medicina popular, averiguaste las propiedades curativas de las diversas hierbas. Estas acostumbrado a recolectar las curas naturales adecuadas en todo tipo de entorno y prepararlas correctamente."],
            [/Choose two attribute boosts\. One must be to Constitution or Wisdom, and one is a free attribute boost\. You’re trained in the Nature skill and the Herbalism Lore skill\. You gain the Natural Medicine skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Naturaleza y Saber (herboristería). Obtienes la dote de habilidad Medicina natural."],
            [/The thrill of the win drew you into games of chance\. This might have been a lucrative sideline that paled in comparison to the real risks of adventuring, or you might have fallen on hard times due to your gambling and pursued adventuring as a way out of a spiral\./, "La excitación de ganar te atrajo a los juegos de azar. Podría haberse tratado de un negocio secundario que palideció en comparación a los riesgos reales de las aventuras, o bien podrías haber pasado momentos difíciles debido al juego y haberte dedicado a las aventuras como forma de salir de dicha espiral."],
            [/Choose two attribute boosts\. One must be to Dexterity or Charisma, and one is a free attribute boost\. You’re trained in the Deception skill and the Games Lore skill\. You gain the Lie to Me skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Engaño y Saber (juego). Obtienes la dote de habilidad Miénteme."],
            [/With a strong back and an understanding of seasonal cycles, you tilled the land and tended crops\. Your farm could have been razed by invaders, you could have lost the family tying you to the land, or you might have simply tired of the drudgery, but at some point, you became an adventurer\./, "Con una fuerte espalda y una comprensión de los ciclos estacionales, arabas la tierra y te ocupabas de las cosechas. Tu granja pudo haber sido arrasada por unos invasores, pudiste haber perdido la familia que te vinculaba a la tierra o simplemente te pudiste haber cansado del trabajo, pero en algún momento te convertiste en aventurero."],
            [/Choose two attribute boosts\. One must be to Constitution or Wisdom, and one is a free attribute boost\. You’re trained in the Athletics skill and the Farming Lore skill\. You gain the Assurance skill feat with Athletics\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Atletismo y Saber (agricultura). Con el Atletismo obtienes la dote de habilidad Seguro."],
            [/Piles of legal manuals, stern teachers, and experience in the courtroom have instructed you in legal matters\. You’re capable of mounting a prosecution or defense in court, and you tend to keep abreast of local laws, as you never know when you might need to know them on short notice\./, "Montones de manuales de jurisprudencia, profesores austeros y mucha experiencia en los tribunales te han instruido en los asuntos legales. Eres capaz de organizar una acusación o una defensa en un tribunal y tiendes a estar al día de las leyes locales, puesto que nunca se puede decir cuándo vas a necesitar dicho conocimiento a corto plazo."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Diplomacy skill and the Legal Lore skill\. You gain the Group Impression skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Diplomacia y Saber (legal). Obtienes la dote de habilidad Impresión de grupo."],
            [/You are incredibly knowledgeable, skilled, and perhaps even trained to teach children and adults about the world and its wonders\. From books to classes, you’re committed to imparting knowledge to all\. Not everything can be taught or learned from a book, though, so you’ve become an adventurer to learn subjects more directly and bring that wisdom back to your students\./, "Eres increíblemente culto, hábil y quizás incluso estás entrenado en enseñar a los niños y a los adultos acerca del mundo y de sus maravillas. De los libros a las clases, estás dedicado a impartir el conocimiento a todos. Sin embargo, no todo se puede enseñar o aprender a partir de un libro, por lo que te has convertido en aventurero para aprender temas de forma más directa y transmitir dicha sabiduría a tus alumnos."],
            [/Choose two attribute boosts\. One must be to Intelligence or Wisdom, and one is a free attribute boost\. You’re trained in your choice of either the Performance or Society skill, as well as the Academia Lore skill\. You gain the Experienced Professional skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado a elegir entre las habilidades Interpretar y Sociedad, así como en la habilidad Saber (académico). Obtienes la dote de habilidad Profesional experto."],
            [/Creating all sorts of minor inventions scratches your itch for problem-solving\. Your engineering skills take a particularly creative bent, and no one knows what you’ll come up with next\. It might be a genius device with tremendous potential or it might explode\./, "Crear todo tipo de inventos menores sacia tu sed de resolución de problemas. Tus habilidades para la ingeniería tienen una deriva particularmente creativa y nadie es capaz de decir con qué saldrás la próxima vez. Podría tratarse de un artilugio genial con un potencial tremendo… o podría explotar."],
            [/Choose two attribute boosts\. One must be to Dexterity or Intelligence, and one is a free attribute boost\. You’re trained in the Crafting skill and the Engineering Lore skill\. You gain the Specialty Crafting skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Destreza o a Inteligencia, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Artesanía y Saber (ingeniería). Obtienes la dote de habilidad Especialidad artesana."],
            [/You heard the call of the sea from a young age\. Perhaps you signed onto a merchant’s vessel, joined the navy, or even fell in with a crew of pirates and scalawags\./, "Oíste la llamada del mar desde muy temprana edad. Quizá te enrolaste en un mercante, te alistaste en la marina o incluso te uniste a una tripulación de piratas y de maleantes."],
            [/Choose two attribute boosts\. One must be to Strength or Dexterity, and one is a free attribute boost\. You’re trained in the Athletics skill and the Sailing Lore skill\. You gain the Underwater Marauder skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Destreza, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Atletismo y Saber (navegar). Obtienes la dote de habilidad Merodeador subacuático."],
            [/In the chaotic rush of battle, you learned to adapt to rapidly changing conditions as you administered to battle casualties\. You patched up soldiers, guards, or other combatants, and learned a fair amount about the logistics of war\./, "En el caótico ajetreo de la batalla, aprendiste a adaptarte a condiciones rápidamente cambiantes mientras atendías a las bajas. Apañaste a soldados, guardias u otros combatientes y aprendiste bastante acerca de la logística de la guerra."],
            [/Choose two attribute boosts\. One must be to Constitution or Wisdom, and one is a free attribute boost\. You’re trained in the Medicine skill and the Warfare Lore skill\. You gain the Battle Medicine skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Medicina y Saber (guerra). Obtienes la dote de habilidad Medicina de guerra."],
            [/In a dusty shop, market stall, or merchant caravan, you bartered wares for coin and trade goods\. The skills you picked up still apply in the adventuring life, in which a good deal on a suit of armor could prevent your death\./, "Despachabas mercancías a cambio de dinero (o las intercambiabas) en una tienda polvorienta, puesto de mercado o caravana de mercaderes. Las habilidades que aprendiste las sigues aplicando en la vida de aventurero, donde haber conseguido un buen trato en una armadura podría prevenir tu muerte."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Diplomacy skill and the Mercantile Lore skill\. You gain the Bargain Hunter skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Diplomacia y Saber (mercantil). Obtienes la dote de habilidad Buscador de gangas."],
            [/You earned a living wrenching precious minerals from the lightless depths of the earth\. Adventuring might have seemed lucrative or glamorous compared to this backbreaking labor— and if you have to head back underground, this time you plan to do so armed with a real weapon instead of a miner’s pick\./, "Te ganabas la vida arrancando minerales preciosos de las profundidades sin luz de la tierra. Las aventuras pueden haberte parecido lucrativas o sofisticadas, comparadas con tan agotadora tarea y, si tienes que volver bajo tierra, esta vez piensas hacerlo provisto de una arma real en lugar de un pico de minero."],
            [/Choose two attribute boosts\. One must be to Strength or Wisdom, and one is a free attribute boost\. You’re trained in the Survival skill and the Mining Lore skill\. You gain the Terrain Expertise skill feat with underground terrain\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Supervivencia y Saber (minería). Obtienes la dote de habilidad Experiencia en un terreno con el terreno subterráneo."],
            [/To the common folk, the life of a noble seems one of idyllic luxury, but growing up as a noble or member of the aspiring gentry, you know the reality: a noble’s lot is obligation and intrigue\. Whether you seek to escape your duties by adventuring or to better your station, you have traded silks and pageantry for an adventurer’s life\./, "Para la gente común, la vida de un noble puede parecer un lujo idílico, pero tras crecer como noble o como aspirante a la nobleza conoces la realidad: el destino de un noble es la obligación y la intriga. Tanto si buscas escapar de tus deberes mediante las aventuras como si quieres mejorar tu estatus, has cambiado la pompa y el boato por la vida de aventurero."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Society skill and your choice of the Genealogy Lore or Heraldry Lore skill\. You gain the Courtly Graces skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Sociedad y a elegir entre Saber (genealogía) y Saber (heráldica). Obtienes la dote de habilidad Gracia cortesana."],
            [/Traveling far and wide, you picked up basic tactics for surviving on the road and in unknown lands, getting by with few supplies and even fewer comforts\. As an adventurer, you travel still, often into even more dangerous places\./, "Viajando por todo lo largo y ancho del mundo, has acumulado tácticas básicas para sobrevivir por los caminos y las tierras desconocidas, aprendiendo a subsistir con pocos suministros y aún menos comodidades. Como aventurero, sigues viajando, a menudo a lugares incluso más peligrosos."],
            [/Choose two attribute boosts\. One must be to Constitution or Wisdom, and one is a free attribute boost\. You’re trained in the Survival skill and a Lore skill related to one terrain you traveled in \(such as Desert Lore or Swamp Lore\)\. You gain the Assurance skill feat with Survival\./, "Elige dos mejoras de atributo. Una tiene que ser a Constitución o a Sabiduría, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Supervivencia y además en una habilidad de Saber relacionada con un terreno al que viajaste (como por ejemplo Saber [desierto] o Saber [pantano]). Obtienes la dote de habilidad Seguro con Supervivencia."],
            [/You have been imprisoned or punished for crimes \(whether you were guilty or not\)\. Now that your sentence has ended or you’ve escaped, you take full advantage of the newfound freedom of your adventuring life\./, "Puedes haber estado preso por algún delito (siendo culpable o no). Ahora que tu sentencia ha acabado o has huido, te aprovechas al máximo de la recién estrenada libertad de tu vida como aventurero."],
            [/Choose two attribute boosts\. One must be to Strength or Constitution, and one is a free attribute boost\. You’re trained in the Stealth skill and the Underworld Lore skill\. You gain the Experienced Smuggler skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Fuerza o a Constitución, y la otra es una mejora de atributo gratuita. Estás entrenado en las habilidades Sigilo y Saber (bajos fondos). Obtienes la dote de habilidad Contrabandista experto."],
            [/You were \(or still are\) a member of a cult whose rites may involve sacred dances to ensure a strong harvest or dire rituals that call upon dark powers\. You might have taken up adventuring to further your cult’s aims, to initiate yourself into the world’s grander mysteries, or to flee unsavory practices or strictures\./, "Eras (o sigues siendo) miembro de una secta cuyos ritos podrían implicar danzas sagradas para asegurar una buena cosecha o tremebundos rituales que llaman a los poderes oscuros. Podrías haberte dedicado a las aventuras para hacer avanzar los objetivos de tu secta, para iniciarte en los misterios mayores del mundo o para huir de prácticas o de exigencias poco agradables."],
            [/Choose two attribute boosts\. One must be to Intelligence or Charisma, and one is a free attribute boost\. You’re trained in the Occultism skill, and a Lore skill related to your deity or cult\. You gain the Schooled in Secrets skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Inteligencia o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Ocultismo y en una habilidad de Saber relacionada con tu dios o tu secta. Obtienes la dote de habilidad Instruido en secretos."],
            [/You have always felt a connection to animals, and it was only a small leap to learn to train them\. As you travel, you continuously encounter different creatures, befriending them along the way\./, "Siempre has notado una conexión con los animales y te costó un esfuerzo mínimo aprender a entrenarlos. Cuando viajas, te encuentras continuamente con diferentes criaturas, haciéndote amigo de ellas por el camino."],
            [/Choose two attribute boosts\. One must be to Wisdom or Charisma, and one is a free attribute boost\. You’re trained in the Nature skill and a Lore skill related to one terrain inhabited by animals you like \(such as Plains Lore or Swamp Lore\)\. You gain the Train Animal skill feat\./, "Elige dos mejoras de atributo. Una tiene que ser a Sabiduría o a Carisma, y la otra es una mejora de atributo gratuita. Estás entrenado en la habilidad Naturaleza y en una habilidad de Saber relacionada con un terreno habitado por los animales que te gustan (como Saber [llanuras] o Saber [pantanos]). Obtienes la dote de habilidad Adiestrar animal."],

            // class descriptions
            [/You are a master of artistry, a scholar of hidden secrets, and a captivating persuader\. Using powerful performances, you influence minds and elevate souls to new levels of heroics\. You might use your powers to become a charismatic leader, or perhaps you might instead be a counselor, manipulator, scholar, scoundrel, or virtuoso\. While your versatility leads some to consider you a beguiling ne-erdo- well and a jack-of-all-trades, it's dangerous to dismiss you as a master of none\./, "Eres un maestro del arte, un erudito de los secretos ocultos y un persuasor que cautiva. Utilizando poderosas interpretaciones, influencias las mentes y elevas las almas a nuevos niveles de heroísmo. Podrías utilizar tus poderes para convertirte en un líder carismático o quizá en su lugar ser un consejero, un manipulador, un erudito, una sabandija o un virtuoso. Si bien tu versatilidad lleva a algunos a considerarte como un vago cautivador y una persona que hace de todo, es peligroso suponer que no dominas nada."],
            [/You command powerful magic, not through study or devotion to any ideal, but as a vessel or agent for a mysterious, otherworldly patron that even you don't entirely understand\. This entity might be a covert divinity, a powerful fey, a manifestation of natural energies, an ancient spirit, or any other mighty supernatural being—but its nature is likely as much a mystery to you as it is to anyone else\. Through a special familiar, your patron grants you versatile spells and powerful hexes to use as you see fit, though you're never certain if these gifts will end up serving your patron's larger plan\./, "Detentas el poder de una magia poderosa, no gracias al estudio ni a la devoción a un ideal, sino por ser el recipiente o el agente de un misterioso patrón de otro mundo al que ni siquiera tú comprendes del todo. Puede tratarse de un dios encubierto, una hada poderosa, un espíritu ancestral o cualquier otro ser sobrenatural omnipotente, pero probablemente su naturaleza es un misterio tanto para ti como para cualquier otro. A través de un familiar especial, tu patrón te concede conjuros versátiles y maleficios poderosos para utilizar a tu antojo, aunque nunca estás seguro de si simplemente estás sirviendo a un plan a gran escala de tu patrón."],
            [/Deities work their will upon the world in infinite ways, and you serve as one of their most stalwart mortal servants\. Blessed with divine magic, you live the ideals of your faith, adorn yourself with the symbols of your church, and train diligently to wield your deity's favored weapon\. Your spells might protect and heal your allies, or they might punish foes and enemies of your faith, as your deity wills\. Yours is a life of devotion, spreading the teachings of your faith through both word and deed\./, "Los dioses obran su voluntad sobre el mundo de infinitas formas y tú eres uno de sus servidores mortales más firmes. Bendecido con la magia divina, vives los ideales de tu fe, te adornas con los símbolos de tu Iglesia y te entrenas de forma diligente para empuñar el arma predilecta de tu dios. Tus conjuros podrían proteger y curar a tus aliados o castigar a tus adversarios y a los enemigos de tu fe, según la voluntad de tu dios. La tuya es una vida de devoción, extendiendo las enseñanzas de tu fe tanto de palabra como de obra."],
            [/The power of nature is impossible to resist\. It can bring ruin to the stoutest fortress in minutes, reducing even the mightiest works to rubble, burning them to ash, burying them beneath an avalanche of snow, or drowning them beneath the waves\. It can provide endless bounty and breathtaking splendor to those who respect it - and an agonizing death to those who take it too lightly\. You are one of those who hear nature's call\. You stand in awe of the majesty of its power and give yourself over to its service\./, "El poder de la Naturaleza es imposible de resistir. Es capaz de reducir a escombros la más recia de las fortalezas, convirtiendo en ruinas incluso sus baluartes más resistentes, dejándolos en cenizas, enterrándolos bajo una avalancha de nieve o ahogándolos bajo las olas. Puede proporcionar un botín infinito y un esplendor impresionante a quienes la respetan… y una muerte agónica a quienes se la toman a la ligera. Eres uno de los que oyen la llamada de la Naturaleza. Contemplas embelesado la majestad de su poder y te pones a su servicio."],
            [/Some rangers believe civilization wears down the soul, but still needs to be protected from wild creatures\. Others say nature needs to be protected from the greedy, who wish to tame its beauty and plunder its treasures\. You could champion either goal, or both\. You might be a scout, tracker, or hunter of fugitives or beasts, haunting the edge of civilization or exploring the wilds\. You know how to live off the land and are skilled at spotting and taking down both opportune prey and hated enemies\./, "Algunos exploradores creen que la civilización desgasta el alma, pero que aun así tiene que ser protegida de las criaturas salvajes. Otros dicen que la Naturaleza debe ser protegida de los avariciosos, que quieren domesticar su belleza y saquear sus tesoros. Puedes ser un campeón de uno de los dos objetivos, o de ambos. Puedes ser un batidor, un rastreador o un cazador de fugitivos o de bestias, acechando en la linde de la civilización o explorando las tierras vírgenes. Sabes cómo vivir del terreno y eres hábil en divisar y en abatir, tanto a las presas de oportunidad como a los enemigos más odiados."],
            [/Fighting for honor, greed, loyalty, or simply the thrill of battle, you are an undisputed master of weaponry and combat techniques. You combine your actions through clever combinations of opening moves, finishing strikes, and counterattacks whenever your foes are unwise enough to drop their guard. Whether you are a knight, mercenary, sharpshooter, or blade master, you have honed your martial skills into an art form and perform devastating critical attacks on your enemies./, "Tanto si luchas por honor, por avaricia, por lealtad o simplemente por la emoción de la batalla, eres un maestro indiscutible de las armas y de las técnicas de combate. Combinas tus acciones mediante una mezcla inteligente de movimientos de abertura, golpes de remate y contraataques siempre que tus enemigos son lo suficientemente incautos como para bajar la guardia. Ya seas un caballero, un mercenario, un francotirador o un maestro de la espada, has refinado tus habilidades marciales en una forma de arte que te permite llevar a cabo devastadores ataques críticos contra tus enemigos."],
            [/You are an eternal student of the secrets of the universe, using your mastery of magic to cast powerful spells\. You treat magic like a science, cross-referencing the latest texts on practical spellcraft with ancient tomes to discover and understand arcane magic\. Yet magical theory is vast, and there's no way you can study it all\. Most wizards learn through formal schooling, with their curriculum informing a specific rubric, although particularly driven researchers sometimes piece together their own theories\./, "Eres un alumno eterno de los secretos arcanos del universo y utilizas tu dominio de la magia para lanzar potentes conjuros. Tratas la magia como una ciencia, cruzando referencias entre los últimos textos sobre lanzamiento práctico de conjuros y antiguos tomos para descubrir y entender cómo funciona la magia arcana. Aun así, la teoría mágica es vasta y no hay forma de estudiarla en su totalidad. La mayoría de los magos aprenden a través de una educación formal y su currículo informa una rúbrica específica, aunque a veces, algunos investigadores particularmente motivados reúnen por sí solos sus propias teorías."],
            [/You are skilled and opportunistic\. Using your sharp wits and quick reactions, you take advantage of your opponents’ missteps and strike where it hurts most\. You play a dangerous game, seeking thrills and testing your skills, and likely don’t care much for any laws that happen to get in your way\. While the path of every rogue is unique and riddled with danger, the one thing you all share in common is the breadth and depth of your skills\./, "Eres hábil y oportunista. Utilizando tu aguda inteligencia y tus rápidas reacciones, sacas partido de los pasos en falso de tu oponente y pegas donde más duele. Tu juego es peligroso, buscando emociones y poniendo a prueba tus habilidades sin que probablemente te preocupen demasiado las leyes que se interpongan en tu camino. Si bien la senda de cada pícaro es única y está salpicada de peligros, lo que tenéis todos en común es la amplitud y la profundidad de vuestras habilidades."],

            // condition descriptions
            [/You can't see\. All normal terrain is difficult terrain to you\. You can't detect anything using vision\. You automatically critically fail Perception checks that require you to be able to see, and if vision is your only precise sense, you take a -4 status penalty to Perception checks\. You are immune to visual effects\. Blinded overrides dazzled\./i, "No puedes ver. Todo el terreno normal es terreno difícil para ti. No puedes detectar nada utilizando la vista. Fallas automáticamente de forma crítica las pruebas de Percepción que requieren ser capaz de ver y, si la vista es tu único sentido preciso, sufres un penalizador -4 por estatus a las pruebas de Percepción. Eres inmune a los efectos visuales. Cegado prevalece sobre deslumbrado."],
            [/Your movements become clumsy and inexact\. Clumsy always includes a value\. You take a status penalty equal to the condition value to Dexterity-based rolls and DCs, including AC, Reflex saves, ranged attack rolls, and skill checks using Acrobatics, Stealth, and Thievery\./i, "Tus movimientos se vuelven torpes e inexactos. Torpe siempre incluye un valor. Sufres un penalizador por estatus igual al valor del estado a las pruebas y a las CD basadas en la Destreza, incluyendo la CA, las salvaciones de Reflejos, las tiradas de ataque a distancia y las pruebas de habilidad que utilizan Acrobacias, Sigilo y Latrocinio."],
            [/You are difficult for one or more creatures to see due to thick fog or some other obscuring feature\. You can be concealed to some creatures but not others\. While concealed, you can still be observed, but you’re tougher to target\. A creature that you’re concealed from must succeed at a DC 5 flat check when targeting you with an attack, spell, or other effect\. If the check fails, you aren’t affected\. Area effects aren’t subject to this flat check\./, "Es difícil que una o más criaturas te vean debido a niebla espesa o algún otro rasgo oscurecedor. Puedes estar oculto de algunas criaturas pero no de otras. Mientras estás oculto, sigues pudiendo estar observado, pero es más difícil que te designen como objetivo. Una criatura de la que estás oculto ha de tener éxito en una prueba plana CD 5 para designarte como objetivo de un ataque, conjuro u otro efecto. Si la prueba falla, no resultas afectado. Los efectos de área no están sujetos a esta prueba plana."],
            [/You don’t have your wits about you, and you attack wildly\. You are off-guard, you don’t treat anyone as your ally \(though they might still treat you as theirs\), and you can’t Delay, Ready, or use reactions\./i, "No estás alerta y atacas de forma incontrolada. Estás desprevenido, no tratas a nadie como aliado (aunque ellos podrían seguirte tratando a ti como aliado suyo) y no puedes Retrasar, Preparar o utilizar reacciones."],
            [/You use all your actions to Strike or cast offensive cantrips, though the GM can have you use other actions to facilitate attack, such as draw a weapon, move so target is in reach, and so forth\. Your targets are determined randomly by the GM\. If you have no other viable targets, you target yourself, automatically hitting but not scoring a critical hit\. If it’s impossible for you to attack or cast spells, you babble incoherently, wasting your actions\./i, "Usas todas tus acciones para dar Golpes o lanzar trucos ofensivos, aunque el DJ puede hacer que uses otras acciones para facilitar el ataque, como desenvainar un arma, moverte para poner un objetivo a tu alcance, etc. Tus objetivos los determina aleatoriamente el DJ. Si no dispones de otros objetivos viables, te designas como objetivo a ti mismo, acertándote automáticamente pero sin conseguir un impacto crítico. Si te es imposible atacar o lanzar conjuros, balbuceas de forma incoherente, malgastando tus acciones."],
            [/Each time you take damage from an attack or spell, you can attempt a DC 11 flat check to recover from your confusion and end the condition\./i, "Cada vez que sufres daño de un ataque o conjuro, puedes hacer una prueba plana CD 11 para recuperarte de la confusión y acabar con el estado."],
            [/You have been commanded, magically dominated, or otherwise had your will subverted\. The controller dictates how you act and can make you use any of your actions, including attacks, reactions, or even Delay\. The controller usually doesn’t have to spend their own actions when controlling you\./i, "Te han dado una orden, te han dominado mágicamente o por lo demás han subvertido tu voluntad. Tu controlador dicta cómo actúas y puede hacer que uses cualquiera de sus acciones, incluyendo ataques, reacciones o incluso Retrasar. Por lo general, el controlador no tiene que gastar acciones propias cuando te controla."],
            [/Your eyes are overstimulated or your vision is swimming\. If vision is your only precise sense, all creatures and objects are concealed from you\./i, "Tus ojos han sido sobreestimulados o se te ha nublado la vista. Si la vista es tu único sentido preciso, todas las criaturas y objetos están ocultos de ti."],
            [/You can’t hear\. You automatically critically fail Perception checks that require you to be able to hear\. You take a –2 status penalty to Perception checks for initiative and checks that involve sound but also rely on other senses\. If you perform an action that has the auditory trait, you must succeed at a DC 5 flat check or the action is lost; attempt the check after spending the action but before any effects are applied\. You are immune to auditory effects while deafened\./i, "No puedes oír. Fallas críticamente de forma automática todas las pruebas de Percepción que requieren que seas capaz de oír. Sufres un penalizador -2 por estatus a las pruebas de Percepción para la iniciativa y para las pruebas que implican el sonido pero que también se basan en otros sentidos. Si llevas a cabo una acción con el rasgo auditivo, has de tener éxito en una prueba plana CD 5 o la acción se pierde; haz la prueba después de gastar la acción, pero antes de aplicar cualquier efecto. Eres inmune a los efectos auditivos cuando estás ensordecido."],
            [/Your soul has been gripped by a powerful force that calls you closer to death\. Doomed always includes a value\. The dying value at which you die is reduced by your doomed value\. If your maximum dying value is reduced to 0, you instantly die\. When you die, you’re no longer doomed\./i, "Tu alma ha sido aferrada por una poderosa fuerza que te lleva a las puertas de la muerte. Condenado siempre incluye un valor. El valor de moribundo al que mueres se reduce en la misma cantidad que tu valor de condenado. Si tu valor de moribundo máximo queda reducido a 0, mueres al instante. Cuando mueres, dejas de estar condenado."],
            [/Your doomed value decreases by 1 each time you get a full night’s rest./i, "Tu valor de condenado disminuye en 1 cada vez que obtienes una noche completa de descanso."],
            [/Your health and vitality have been depleted as you’ve lost blood, life force, or some other essence\. Drained always includes a value\. You take a status penalty equal to your drained value to Constitution-based rolls and DCs, such as Fortitude saves\. You also lose a number of Hit Points equal to your level \(minimum 1\) times the drained value, and your maximum Hit Points are reduced by the same amount\. For example, if you become drained 3 and you’re a 3rd-level character, you lose 9 Hit Points and reduce your maximum Hit Points by 9\. Losing these Hit Points doesn’t count as taking damage\./i, "Tu salud y tu vitalidad se han visto disminuidos al perder sangre, fuerza vital o alguna otra esencia. Drenado incluye siempre un valor. Sufres un penalizador por estatus igual a tu valor de drenado a las pruebas basadas en la Constitución, como por ejemplo las salvaciones de Fortaleza. También pierdes tantos Puntos de Golpe como tu nivel (mínimo 1) multiplicado por el valor de drenado, y tus Puntos de Golpe máximos se ven reducidos en la misma cantidad. Por ejemplo, si quedas drenado 3 y eres un personaje de 3.er nivel, pierdes 9 Puntos de Golpe y reduces en 9 tu máximo de PG. Perder dichos Puntos de Golpe no cuenta como sufrir daño."],
            [/Each time you get a full night’s rest, your drained value decreases by 1\. This increases your maximum Hit Points, but you don’t immediately recover the lost Hit Points\./i, "Cada vez que obtienes una noche completa de descanso, tu valor de drenado disminuye en 1. Esto incrementa tus PG máximos, pero no recuperas de inmediato los Puntos de Golpe perdidos."],
            [/You are bleeding out or otherwise at death’s door\. While you have this condition, you are unconscious\. Dying always includes a value, and if it ever reaches dying 4, you die\. When you’re dying, you must attempt a recovery check at the start of your turn each round to determine whether you get better or worse\. Your dying condition increases by 1 if you take damage while dying, or by 2 if you take damage from an enemy’s critical hit or a critical failure on your save\./i, "Te estás desangrando o estás de alguna otra manera a las puertas de la muerte. Mientras te encuentras en este estado, estás inconsciente. Moribundo incluye siempre un valor y, si en algún momento llegas a moribundo 4, mueres. Cuando estás moribundo, tienes que hacer una prueba de recuperación al inicio de tu turno cada asalto, para determinar si mejoras o empeoras. Tu estado moribundo se incrementa en 1 si sufres daño mientras estás moribundo, o en 2 si sufres daño por parte de un impacto crítico del enemigo o de un fallo crítico en tu salvación."],
            [/If you lose the dying condition by succeeding at a recovery check and are still at 0 Hit Points, you remain unconscious, but you can wake up as described in that condition\. You lose the dying condition automatically and wake up if you ever have 1 Hit Point or more\. Any time you lose the dying condition, you gain the wounded 1 condition, or increase your wounded condition value by 1 if you already have that condition\./i, "Si pierdes el estado moribundo teniendo éxito en una prueba de recuperación y sigues a 0 Puntos de Golpe, permaneces inconsciente pero te puedes despertar tal y como se indica en el estado inconsciente. Pierdes automáticamente el estado moribundo y te despiertas si llegas a tener 1 Punto de Golpe o más. En cualquier momento en el que pierdes el estado moribundo, sufres el estado herido 1 o incrementas en 1 tu valor de herido si ya lo tienes."],
            [/While you’re dying, attempt a recovery check at the start of each of your turns\. This is a flat check with a DC equal to 10 \+ your current dying value to see if you get better or worse\./i, "Mientras estás moribundo, haces una prueba de recuperación al inicio de cada uno de tus turnos. Se trata de una prueba plana con una CD igual a 10 + tu valor actual de moribundo, para ver si mejoras o empeoras."],
            [/Your dying value is reduced by 2\./i, "Tu valor de moribundo se reduce en 2."],
            [/Your dying value is reduced by 1\./i, "Tu valor de moribundo se reduce en 1."],
            [/Your dying value increases by 1\./i, "Tu valor de moribundo se incrementa en 1."],
            [/Your dying value increases by 2\./i, "Tu valor de moribundo se incrementa en 2."],
            [/If you take damage while you already have the dying condition, increase your dying condition value by 1, or by 2 if the damage came from an attacker’s critical hit or your own critical failure\./i, "Si sufres (más) daño mientras estás moribundo, incrementa tu estado de moribundo en 1 o en 2 si el daño ha procedido de un impacto crítico de un atacante o de un fallo crítico tuyo."],
            [/You are carrying more weight than you can manage\. While you’re encumbered, you’re clumsy 1 and take a 10-foot penalty to all your Speeds\. As with all penalties to your Speed, this can’t reduce your Speed below 5 feet\./i, "Llevas más peso del que puedes acarrear. Mientras estás impedido, estás torpe 1 y sufres un penalizador -10 pies (3 m) a todas tus Velocidades. Como con todos los penalizadores a la Velocidad, éste no puede reducirla por debajo de 5 pies (1,5 m)."],
            [/You’re physically weakened\. Enfeebled always includes a value\. When you are enfeebled, you take a status penalty equal to the condition value to Strength-based rolls and DCs, including Strength-based melee attack rolls, Strength-based damage rolls, and Athletics checks\./i, "Tu capacidad física se ha visto reducida. Debilitado siempre incluye un valor. Cuando estás debilitado sufres un penalizador por estatus igual al valor del estado a las tiradas y a las CD basadas en la Fuerza, incluyendo las tiradas de ataque cuerpo a cuerpo basadas en la Fuerza, las tiradas de daño basadas en la Fuerza y las pruebas de Atletismo."],
            [/You’re compelled to focus your attention on something, distracting you from whatever else is going on around you\. You take a –2 status penalty to Perception and skill checks, and you can’t use concentrate actions unless they \(or their intended consequences\) are related to the subject of your fascination, as determined by the GM\. For instance, you might be able to Seek and Recall Knowledge about the subject, but you likely couldn’t cast a spell targeting a different creature\. This condition ends if a creature uses hostile actions against you or any of your allies\./i, "Te ves obligado a centrar tu atención en algo, lo que te distrae de todo lo demás que sucede a tu alrededor. Sufres un penalizador -2 por estatus a las pruebas de Percepción y de habilidad y no puedes usar acciones con el rasgo concentrar si dichas acciones (o sus consecuencias previstas) no están relacionadas con el motivo de tu fascinación, a determinar por el DJ. Por ejemplo, podrías ser capaz de Buscar y de Recordar conocimiento acerca del motivo, pero probablemente no podrías lanzar un conjuro que designara como objetivo a una criatura diferente. Este estado se acaba si una criatura lleva a cabo acciones hostiles contra ti o contra cualquiera de tus aliados."],
            [/You’re tired and can’t summon much energy\. You take a –1 status penalty to AC and saving throws\. You can’t use exploration activities performed while traveling\./i, "Estás cansado y no puedes reunir mucha energía. Sufres un penalizador -1 por estatus a la CA y a las tiradas de salvación. No puedes usar las actividades de exploración que tienen lugar mientras se viaja."],
            [/You recover from fatigue after a full night’s rest\./i, "Te recuperas de la fatiga después de una noche completa de descanso."],
            [/You’re forced to run away due to fear or some other compulsion\. On your turn, you must spend each of your actions trying to escape the source of the fleeing condition as expediently as possible \(such as by using move actions to flee, or opening doors barring your escape\)\. The source is usually the effect or creature that gave you the condition, though some effects might define something else as the source\. You can’t Delay or Ready while fleeing\./i, "Te ves obligado a huir debido al miedo o a alguna otra compulsión. En tu turno, tienes que gastar cada una de tus acciones intentando huir del origen del estado de la forma más expeditiva posible (por ejemplo, usando acciones de movimiento para irte o abriendo puertas que evitan tu huida). El origen suele ser el efecto o criatura que te ha impuesto el estado, aunque algunos efectos podrían definir otra cosa como origen. No puedes Retrasar ni Preparar mientras huyes."],
            [/You’re gripped by fear and struggle to control your nerves\. The frightened condition always includes a value\. You take a status penalty equal to this value to all your checks and DCs\. Unless specified otherwise, at the end of each of your turns, the value of your frightened condition decreases by 1\./i, "Eres presa del pánico y luchas para controlar los nervios. El estado asustado siempre incluye un valor. Sufres un penalizador por estatus igual a dicho valor a todas tus pruebas y CD. Si no se indica lo contrario, al final de cada uno de tus turnos el valor de tu estado asustado disminuye en 1."],
            [/You’re held in place by another creature, giving you the off-guard and immobilized conditions\. If you attempt a manipulate action while grabbed, you must succeed at a DC 5 flat check or it is lost; roll the check after spending the action, but before any effects are applied\./i, "Otra criatura te mantiene fijo en tu lugar, lo que te impone los estados desprevenido e inmovilizado. Si emprendes una acción de manipular mientras estás agarrado, has de tener éxito en una prueba plana CD 5 o la pierdes; haz la tirada después de gastar la acción, pero antes de aplicar ningún efecto."],
            [/While you’re hidden from a creature, that creature knows the space you’re in but can’t tell precisely where you are\. You typically become hidden by using Stealth to Hide\. When Seeking a creature using only imprecise senses, it remains hidden, rather than observed\. A creature you’re hidden from is off-guard to you, and it must succeed at a DC 11 flat check when targeting you with an attack, spell, or other effect or it fails to affect you\. Area effects aren’t subject to this flat check\./i, "Mientras estás escondido de una criatura, dicha criatura conoce el espacio en el que estás pero no puede determinar con precisión dónde. Lo normal es que te escondas utilizando Sigilo para Esconderte. Cuando Buscas a una criatura utilizando tan solo sentidos imprecisos, permanece escondida en lugar de observada. Una criatura de la que estás escondido está desprevenida ante ti y ha de tener éxito en una prueba plana CD 11 para designarte como objetivo de un ataque, conjuro u otro efecto, o no consigue afectarte. Los efectos de área no están sujetos a esta prueba plana."],
            [/A creature might be able to use the Seek action to try to observe you\./i, "Una criatura podría ser capaz de utilizar la acción Buscar para observarte."],
            [/You are incapable of movement\. You can’t use any actions that have the move trait\. If you’re immobilized by something holding you in place and an external force would move you out of your space, the force must succeed at a check against either the DC of the effect holding you in place or the relevant defense \(usually Fortitude DC\) of the monster holding you in place\./i, "No puedes moverte. Eres incapaz de utilizar acción alguna con el rasgo movimiento. Si estás inmovilizado por algo que te mantiene fijo en un lugar y una fuerza externa te sacaría de tu espacio, dicha fuerza ha de tener éxito en una prueba, o bien contra la CD del efecto que te mantiene en tu lugar, o bien contra la defensa relevante (por lo general, la CD de Fortaleza) del monstruo que te mantiene inmóvil."],
            [/You can’t be seen\. You’re undetected to everyone\. Creatures can Seek to detect you; if a creature succeeds at its Perception check against your Stealth DC, you become hidden to that creature until you Sneak to become undetected again\. If you become invisible while someone can already see you, you start out hidden to them \(instead of undetected\) until you successfully Sneak\. You can’t become observed while invisible except via special abilities or magic\./i, "No puedes ser visto. Estás no detectado para todo el mundo. Las criaturas pueden Buscar para detectarte; si una criatura tiene éxito en su prueba de Percepción contra tu CD de Sigilo, quedas escondido para ella hasta que utilizas Movimiento furtivo para volver al estado de no detectado. Si te haces invisible cuando alguien puede verte, empiezas escondido para dicha criatura (en lugar de no detectado) hasta que utilizas con éxito Movimiento furtivo. No puedes quedar observado mientras eres invisible excepto mediante el uso de aptitudes especiales o magia."],
            [/Anything in plain view is observed by you\. If a creature takes measures to avoid detection, such as by using Stealth to Hide, it can become hidden or undetected instead of observed\. If you have another precise sense besides sight, you might be able to observe a creature or object using that sense instead\. You can observe a creature with only your precise senses\. When Seeking a creature using only imprecise senses, it remains hidden, rather than observed\./i, "Cualquier cosa a plena vista está observada por ti. Si una criatura toma medidas para evitar la detección, como por ejemplo utilizar el Sigilo para Esconderse, puede pasar a estar escondida o no detectada en lugar de observada. Si tienes otro sentido preciso aparte de la vista, podrías ser capaz de observar a una criatura u objeto utilizando en su lugar dicho sentido. Tan solo puedes observar a una criatura con tus sentidos precisos. Cuando Buscas a una criatura utilizando tan solo sentidos imprecisos, permanece escondida en lugar de observada."],
            [/You’re distracted or otherwise unable to focus your full attention on defense\. You take a –2 circumstance penalty to AC\. Some effects give you the off-guard condition only to certain creatures or against certain attacks\. Others - especially conditions - can make you off-guard against everything\. If a rule doesn’t specify that the condition applies only to certain circumstances, it applies to all of them, such as "The target is off-guard\."/i, "Estas distraído o de alguna otra forma eres incapaz de centrar tu atención completa en la defensa. Sufres un penalizador -2 por circunstancia a la CA. Algunos efectos te imponen el estado desprevenido tan sólo frente a determinadas criaturas o contra determinados ataques. Otros, en especial los estados, te pueden dejar desprevenido contra todo. Si una regla no especifica que el estado sólo se aplica a determinadas circunstancias, se aplica a todas ellas, como por ejemplo «El objetivo queda desprevenido»."],
            [/You’re frozen in place\. You have the off-guard condition and can’t act except to Recall Knowledge and use actions that require only your mind \(as determined by the GM\)\. Your senses still function, but only in the areas you can perceive without moving, so you can’t Seek\./i, "Tu cuerpo está congelado en un lugar. Sufres el estado desprevenido y no puedes actuar excepto para Recordar conocimiento y utilizar acciones que sólo requieren el uso de la mente (a determinar por el DJ). Tus sentidos siguen funcionando, pero sólo en las áreas que puedes percibir sin moverte, por lo que no puedes Buscar."],
            [/You are taking damage from an ongoing effect, such as from being lit on fire\. This appears as "X persistent \[type\] damage," where "X" is the amount of damage dealt and "\[type\]" is the damage type\. Like normal damage, it can be doubled or halved based on the results of an attack roll or saving throw\. Instead of taking persistent damage immediately, you take it at the end of each of your turns as long as you have the condition, rolling any damage dice anew each time\. After you take persistent damage, roll a DC 15 flat check to see if you recover from the persistent damage\. If you succeed, the condition ends\./i, "Estás sufriendo daño de un efecto continuado, como por ejemplo estar ardiendo. Esto aparece como «X daño persistente [tipo]», donde «X» es la cantidad de daño infligido y «[tipo]» es el tipo de daño. Como el daño normal, se puede doblar o reducir a la mitad basándose en los resultados de una tirada de ataque o tirada de salvación. En lugar de sufrir el daño persistente de inmediato, lo sufres al final de cada uno de tus turnos si tienes el estado, tirando de nuevo cualquier dado de daño cada vez. Después de sufrir daño persistente, haz una prueba plana CD 15 para ver si te recuperas del mismo. Si tienes éxito, el estado se acaba."],
            [/You have been turned to stone\. You can’t act, nor can you sense anything\. You become an object with a Bulk double your normal Bulk \(typically 12 for a petrified Medium creature or 6 for a petrified Small creature\), AC 9, Hardness 8, and the same current Hit Points you had when alive\. You don’t have a Broken Threshold\. When the petrified condition ends, you have the same number of Hit Points you had as a statue\. If the statue is destroyed, you immediately die\. While petrified, your mind and body are in stasis, so you don’t age or notice the passing of time\./i, "Te han convertido en piedra. No puedes actuar, ni sentir nada. Te conviertes en un objeto con una Impedimenta doble de la tuya normal (típicamente 12 para una criatura Mediana petrificada o 6 para una criatura Pequeña petrificada), CA 9, Dureza 8 y los mismos Puntos de Golpe actuales que cuando estabas vivo. Careces de Umbral de rotura. Cuando acaba el estado petrificado, tienes el mismo número de Puntos de Golpe que tenías como estatua. Si la estatua queda destruida, mueres de inmediato. Mientras estás petrificado, tu cuerpo y tu mente están en estasis, por lo que no envejeces ni te das cuenta del paso del tiempo."],
            [/You’re lying on the ground\. You are off-guard and take a –2 circumstance penalty to attack rolls\. The only move actions you can use while you’re prone are Crawl and Stand\. Standing up ends the prone condition\. You can Take Cover while prone to hunker down and gain greater cover against ranged attacks, even if you don’t have an object to get behind, which grants you a \+4 circumstance bonus to AC against ranged attacks \(but you remain off-guard\)\./i, "Estás tendido en el suelo. Estás desprevenido y sufres un penalizador -2 por circunstancia a las tiradas de ataque. Las únicas acciones de movimiento que puedes utilizar son Gatear y Ponerte de pie. Ponerte de pie acaba con el estado tumbado. Puedes Ponerte a cubierto mientras estás tumbado para ponerte en cuclillas y conseguir cobertura mayor contra los ataques a distancia, incluso si no tienes ningún objeto tras el que parapetarte, lo que te concede un bonificador +4 por circunstancia a la CA contra los ataques a distancia (pero sigues desprevenido)."],
            [/If you would be knocked prone while you’re Climbing or Flying, you fall\. You can’t be knocked prone when Swimming\./i, "Si algo te haría quedar tumbado cuando estás Trepando o Volando, caes al suelo (ver pág. 421 para las reglas sobre caídas). No puedes quedar tumbado mientras estás Nadando."],
            [/You’re able to act more quickly\. You gain 1 additional action at the start of your turn each round\. Many effects that make you quickened require you use this extra action only in certain ways\. If you become quickened from multiple sources, you can use the extra action you’ve been granted for any single action allowed by any of the effects that made you quickened\. Because quickened has its effect at the start of your turn, you don’t immediately gain actions if you become quickened during your turn\./i, "Eres capaz de moverte con más rapidez. Obtienes 1 acción adicional al inicio de tu turno en cada asalto. Muchos efectos que te aceleran requieren que uses la acción adicional sólo de ciertas formas. Si te aceleras debido a múltiples orígenes, puedes utilizar la acción adicional concedida para cualquier acción individual concedida por cualquiera de los efectos que te han acelerado. Como quiera que acelerado tiene efecto al inicio de tu turno, no obtienes acciones de inmediato si te aceleran durante tu turno."],
            [/You’re tied up and can barely move, or a creature has you pinned\. You have the off-guard and immobilized conditions, and you can’t use any attack or manipulate actions except to attempt to Escape or Force Open your bonds\. Restrained overrides grabbed\./i, "Estás atado y apenas puedes moverte, o una criatura te tiene sujeto. Sufres los estados desprevenido e inmovilizado, y no puedes utilizar ningún ataque o acción de manipular excepto tratar de Huir o Abrir por la fuerza tus ligaduras. Neutralizado prevalece sobre agarrado."],
            [/You feel ill\. Sickened always includes a value\. You take a status penalty equal to this value on all your checks and DCs\. You can’t willingly ingest anything - including elixirs and potions - while sickened\./i, "No te encuentras bien. Indispuesto siempre incluye un valor. Sufres un penalizador por estatus igual a dicho valor a todas tus pruebas y CD. No puedes ingerir nada voluntariamente (incluyendo elixires y pociones) mientras estás indispuesto."],
            [/You can spend a single action retching in an attempt to recover, which lets you immediately attempt a Fortitude save against the DC of the effect that made you sickened\. On a success, you reduce your sickened value by 1 \(or by 2 on a critical success\)\./i, "Puedes invertir una acción individual vomitando, en un intento de recuperarte, lo que te permite hacer de inmediato una salvación de Fortaleza contra la CD del efecto que te ha dejado indispuesto. Con un éxito, reduces en 1 tu valor de indispuesto (o en 2 con un éxito crítico)."],
            [/You have fewer actions\. Slowed always includes a value\. When you regain your actions, reduce the number of actions regained by your slowed value\. Because you regain actions at the start of your turn, you don’t immediately lose actions if you become slowed during your turn\./i, "Tienes menos acciones. Lentificado siempre incluye un valor. Cuando recuperas tus acciones, reduce el número recuperado en tu valor de lentificado. Como quiera que recuperas acciones al inicio de tu turno, no pierdes acciones de inmediato si te lentifican durante tu turno."],
            [/You’ve become senseless\. You can’t act\. Stunned usually includes a value, which indicates how many total actions you lose, possibly over multiple turns, from being stunned\. Each time you regain actions, reduce the number you regain by your stunned value, then reduce your stunned value by the number of actions you lost\. For example, if you were stunned 4, you would lose all 3 of your actions on your turn, reducing you to stunned 1; on your next turn, you would lose 1 more action, and then be able to use your remaining 2 actions normally\. Stunned might also have a duration instead, such as "stunned for 1 minute," causing you to lose all your actions for the duration\./i, "Has perdido el control de tus sentidos. No puedes actuar. Aturdido suele incluir un valor que indica cuántas acciones en total pierdes, posiblemente a lo largo de múltiples turnos, debido a estar aturdido. Cada vez que recuperas acciones, reduce en tu valor de aturdido el número que recuperas, y después reduce tu valor de aturdido en el número de acciones perdidas. Por ejemplo, si estabas aturdido 4, perderías tus 3 acciones del turno, lo que te reduciría a aturdido 1; en tu siguiente turno, perderías una acción más, y después podrías utilizar de forma normal tus 2 acciones restantes. En lugar de ello, aturdido podría tener una duración, como por ejemplo «aturdido durante 1 minuto», lo que te haría perder todas tus acciones durante ese tiempo."],
            [/Stunned overrides slowed\. If the duration of your stunned condition ends while you are slowed, you count the actions lost to the stunned condition toward those lost to being slowed\. So, if you were stunned 1 and slowed 2 at the beginning of your turn, you would lose 1 action from stunned, and then lose only 1 additional action by being slowed, so you would still have 1 action remaining to use that turn\./i, "Aturdido prevalece sobre lentificado. Si la duración de tu estado aturdido se acaba mientras estás lentificado, cuenta las acciones perdidas debido al estado aturdido contra las que has perdido por estar lentificado. Por lo tanto, si estuvieras aturdido 1 y lentificado 2 al inicio de tu turno, perderías 1 acción por aturdido y después 1 acción adicional por lentificado; por lo tanto aún te quedaría 1 acción para utilizar en dicho turno."],
            [/Your thoughts and instincts are clouded\. Stupefied always includes a value\. You take a status penalty equal to this value on Intelligence-, Wisdom-, and Charisma-based rolls and DCs, including Will saving throws, spell attack modifiers, spell DCs, and skill checks that use these attribute modifiers\. Any time you attempt to Cast a Spell while stupefied, the spell is disrupted unless you succeed at a flat check with a DC equal to 5 \+ your stupefied value\./i, "Tus pensamientos y tus instintos están nublados. Anonadado siempre incluye un valor. Sufres un penalizador por estatus igual a dicho valor a las pruebas y a las CD basadas en la Inteligencia, la Sabiduría y el Carisma, incluyendo las salvaciones de Voluntad, los modificadores al ataque de conjuros, las CD de conjuros y las pruebas de habilidad que utilizan dichos modificadores por atributo. Si Lanzas un conjuro estando anonadado, quedará perturbado a menos que tengas éxito en una prueba plana con una CD igual a 5 + tu valor de anonadado."],
            [/You’re sleeping or have been knocked out\. You can’t act\. You take a –4 status penalty to AC, Perception, and Reflex saves, and you have the blinded and off-guard conditions\. When you gain this condition, you fall prone and drop items you’re holding unless the effect states otherwise or the GM determines you’re positioned so you wouldn’t\./i, "Estás dormido o te han noqueado. No puedes actuar. Sufres un penalizador -4 por estatus a la CA, la Percepción y las salvaciones de Reflejos, además de los estados cegado y desprevenido. Cuando sufres este estado, caes tumbado y sueltas los objetos que sostienes, si el efecto no indica lo contrario o el DJ no determina que estás en una posición que no te lo permite."],
            [/If you’re unconscious because you’re dying, you can’t wake up while you have 0 Hit Points\. If you are restored to 1 Hit Point or more, you lose the dying and unconscious conditions and can act normally on your next turn\./i, "Si estás inconsciente debido a estar moribundo, no puedes despertar mientras estás a 0 Puntos de Golpe. Si se te devuelve a 1 Punto de Golpe o más, pierdes los estados moribundo e inconsciente y puedes actuar normalmente en tu siguiente turno."],
            [/If you are unconscious and at 0 Hit Points, but not dying, you return to 1 Hit Point and awaken after sufficient time passes\. The GM determines how long you remain unconscious, from a minimum of 10 minutes to several hours\. If you are healed, you lose the unconscious condition and can act normally on your next turn\./i, "Si estás inconsciente y a 0 Puntos de Golpe, pero no moribundo, vuelves a 1 Punto de Golpe y despiertas una vez ha pasado el tiempo suficiente. El DJ es quien determina cuánto tiempo permaneces inconsciente, desde un mínimo de 10 minutos hasta varias horas. Si te curan, pierdes el estado inconsciente y puedes actuar normalmente en tu siguiente turno."],
            [/If you’re unconscious and have more than 1 Hit Point \(typically because you are asleep or unconscious due to an effect\), you wake up in one of the following ways\./i, "Si estás inconsciente y tienes más de 1 Punto de Golpe (típicamente porque estás dormido o inconsciente debido a un efecto), despiertas de una de las siguientes formas."],
            [/You take damage, though if the damage reduces you to 0 Hit Points, you remain unconscious and gain the dying condition as normal\./i, "Sufres daño, aunque si el daño te reduce a 0 Puntos de Golpe, quedas inconsciente y sufres el estado moribundo de la forma normal."],
            [/You receive healing, other than the natural healing you get from resting\./i, "Recibes curación, diferente a la natural que obtienes del descanso."],
            [/Someone shakes you awake with an Interact action\./i, "Alguien te mueve para despertarte mediante una acción de Interactuar."],
            [/Loud noise around you might wake you\. At the start of your turn, you automatically attempt a Perception check against the noise’s DC \(or the lowest DC if there is more than one noise\), waking up if you succeed\. If creatures are attempting to stay quiet around you, this Perception check uses their Stealth DCs\. Some effects make you sleep so deeply that they don’t allow you this Perception check\./i, "Hay mucho ruido a tu alrededor que podría despertarte. Al inicio de tu turno, haces automáticamente una prueba de Percepción contra la CD del ruido (o contra la CD menor si hay más de uno), despertando si tienes éxito. Si hay criaturas intentando no hacer ruido a tu alrededor, esta prueba de Percepción utiliza su CD de Sigilo. Algunos efectos te hacen dormir de forma tan profunda que no permiten esta prueba de Percepción."],
            [/If you are simply asleep, the GM decides you wake up either because you have had a restful night’s sleep or something disrupted that rest\./i, "Si simplemente estás dormido el DJ decide que te despiertas, o bien porque has tenido una noche de sueño reparador, o bien porque algo ha interrumpido tu descanso."],
            [/When you are undetected by a creature, that creature can’t see you at all, has no idea what space you occupy, and can’t target you, though you still can be affected by abilities that target an area\. When you’re undetected by a creature, that creature is off-guard to you\./i, "Cuando no has sido detectado por una criatura, dicha criatura no puede verte, no tiene idea alguna del espacio que ocupas, y no puede designarte como objetivo, aunque sigues pudiendo verte afectado por aptitudes con área de efecto. Cuando no has sido detectado por una criatura, dicha criatura está desprevenida ante ti."],
            [/A creature you’re undetected by can guess which square you’re in to try targeting you\. It must pick a square and attempt an attack\. This works like targeting a hidden creature \(requiring a DC 11 flat check, but the flat check and attack roll are rolled in secret by the GM, who doesn’t reveal whether the attack missed due to failing the flat check, failing the attack roll, or choosing the wrong square\. They can Seek to try to find you\./i, "Una criatura que no te ha detectado puede adivinar en qué casilla estás para designarte como objetivo. Tiene que elegir una casilla y llevar a cabo un ataque. Esto funciona igual que designar como objetivo a una criatura escondida (requiriendo una prueba plana CD 11), pero la prueba plana y la tirada de ataque las tira en secreto el DJ, que no revela si el ataque falla debido a fallar la prueba plana, a fallar la tirada de ataque o a elegir la casilla equivocada. Puede Buscar para ver si te encuentra."],
            [/If you’re unnoticed by a creature, that creature has no idea you’re present\. When you’re unnoticed, you’re also undetected\. This matters for abilities that can be used only against targets totally unaware of your presence\./i, "Si estás inadvertido para una criatura, dicha criatura no tiene ni idea de que estás presente. Cuando estás inadvertido, también estás no detectado. Esto sólo importa para las aptitudes que se pueden utilizar sólo contra objetivos totalmente ignorantes de tu presencia."],
            [/You have been seriously injured\. If you lose the dying condition and do not already have the wounded condition, you become wounded 1\. If you already have the wounded condition when you lose the dying condition, your wounded condition value increases by 1\. If you gain the dying condition while wounded, increase your dying condition value by your wounded value\./i, "Has sufrido una herida grave. Si pierdes el estado moribundo y aún no tienes el estado herido, quedas herido 1. Si ya tenías el estado herido cuando pierdes el estado moribundo, el valor de tu estado herido se incrementa en 1. Si sufres el estado moribundo mientras estás herido, incrementa el valor de tu estado moribundo en tu valor de herido."],
            [/The wounded condition ends if someone successfully restores Hit Points to you using Treat Wounds, or if you are restored to full Hit Points by any means and rest for 10 minutes\./i, "El estado herido acaba si alguien te restablece con éxito Puntos de Golpe utilizando Tratar heridas, o bien si te restablecen a tus Puntos de Golpe completos por cualquier medio y descansas durante 10 minutos."],

            // weapon descriptions
            [/These bombs come in a variety of types and levels of power, but no matter the variety, you throw the bomb at the target and it explodes, unleashing its alchemical blast\./i, "Estas bombas exhiben una gran variedad y niveles de potencia pero, sea cual sea la variedad, arrojas la bomba contra el objetivo y explota, desencadenando su explosión alquímica."],
            [/This large and well-made crossbow requires some training to use effectively, but it’s assembled with a cutting-edge firing mechanism that maximizes its speed, power, and accuracy\./i, "Esta ballesta grande y de buena manufactura requiere algún entrenamiento para usarla de forma efectiva, pero está ensamblada con un mecanismo de disparo de vanguardia, que maximiza su velocidad, su potencia y su precisión."],
            [/This broad-bladed sword, sometimes called the hand‑and‑a‑half sword, has a longer grip so it can be held in one hand or used with two hands to provide extra piercing or slashing power\./i, "Esta espada de hoja ancha, a veces llamada espada de mano y media, tiene una empuñadura más larga, por lo que se puede utilizar a una mano o a dos manos para un poder cortante mayor."],
            [/These axes are designed explicitly as weapons, rather than tools\. They typically weigh less, with a shaft reinforced with metal bands or bolts, and have a sharper blade, making them ideal for chopping limbs rather than wood\./i, "Estas hachas han sido diseñadas explícitamente como armas, y no como herramientas. Pesan típicamente menos, tienen el mango reforzado con bandas metálicas o con remaches y su hoja es más afilada, lo que las convierte en ideales para cortar extremidades en lugar de madera."],
            [/This long, narrow tube is used for shooting blowgun darts, using only the power of a forcefully exhaled breath\./i, "Este tubo largo y estrecho se utiliza para disparar dardos, usando sólo el poder del aliento exhalado con fuerza."],
            [/This strong but slender staff is tapered at the ends and well balanced\. It's designed to be an offensive and defensive weapon\./i, "Este bastón fuerte pero delgado es más fino en los extremos y bien equilibrado. Está diseñado como arma ofensiva y defensiva."],
            [/This throwing weapon consists of weights tied to the end of long cords, which can be used to bludgeon foes or entangle their legs./i, "Esta arma arrojadiza consiste en dos pesos atados al extremo de unas largas cuerdas, que se pueden usar para golpear a los enemigos o para enredar sus piernas."],
            [/This broad dagger is carried by dwarves as a weapon, tool, and designation of clan\. Losing or having to surrender a clan dagger is considered a mark of embarrassment to most dwarves\./i, "Esta ancha daga es la que lucen los enanos como arma, herramienta y designación de clan. Perder o tener que rendir una daga de clan se considera altamente embarazoso por parte de la mayoría de los enanos."],
            [/This is a piece of stout wood shaped or repurposed to bludgeon an enemy\. Clubs can be intricately carved pieces of martial art or as simple as a tree branch or piece of wood\./i, "Esto es un trozo de madera recia, al que se da forma o se readapta para atizar con él a un enemigo. Las clavas pueden ser piezas intrincadamente talladas de arte marcial o algo tan simple como una rama de árbol o un trozo de madera."],
            [/This projectile weapon is made from horn, wood, and sinew laminated together to increase the power of its pull and the force of its projectile\. Like all longbows, its great size also increases the bow's range and power\. You must use two hands to fire it, and it cannot be used while mounted\. Any time an ability is specifically restricted to a longbow it also applies to composite longbows unless otherwise stated\./i, "Esta arma de proyectiles está hecha de cuerno, madera y tendones, todo ello laminado junto para incrementar el poder de su tensión y la fuerza de su proyectil. Como todos los arcos largos, su gran tamaño también incrementa su distancia efectiva y su potencia. Tienes que usar las dos manos para dispararlo y no se puede utilizar montado. Siempre que una aptitud está específicamente restringida a un arco largo, como por ejemplo el arma predilecta de Erastil, también se aplica a los arcos largos compuestos si no se indica lo contrario."],
            [/This shortbow is made from horn, wood, and sinew laminated together to increase the power of its pull and the force of its projectile\. Its compact size and power make it a favorite of mounted archers\. Any time an ability is specifically restricted to a shortbow, it also applies to composite shortbows unless otherwise stated\./i, "Este arco corto está hecho de cuerno, madera y tendones, todo ello laminado junto para incrementar el poder de su tensión y la fuerza de su proyectil. Su tamaño compacto y su potencia hacen que sea el favorito de los arqueros montados. Siempre que una aptitud está específicamente restringida a un arco corto, también se aplica a los arcos cortos compuestos si no se indica lo contrario."],
            [/This ranged weapon has a bow-like assembly mounted on a handled frame called a tiller\. The tiller has a mechanism to lock the bowstring in place, attached to a trigger mechanism that releases the tension and launches a bolt\./i, "Esta arma a distancia es un arco montado sobre una base recta llamada timón (NdT: o culata). El timón tiene un mecanismo para fijar la cuerda en su lugar y está conectado con un gatillo que libera la tensión y dispara el virote."],
            [/This small, bladed weapon is held in one hand and used to stab a creature in close combat\. It can also be thrown\./i, "Esta pequeña arma blanca se empuña a una mano y se utiliza para apuñalar a una criatura en combate cerrado. También se puede usar como arma arrojadiza."],
            [/This thrown weapon is larger than an arrow but shorter than a javelin\. It typically has a short shaft of wood ending in a metal tip and is sometimes stabilized by feathers or fur\./i, "Esta arma arrojadiza es más grande que una flecha pero más corta que una jabalina. Suele tener un mástil corto de madera que acaba en una punta metálica y a veces va estabilizado con plumas o pelaje."],
            [/This short, curved, and crude makeshift blade often has holes drilled into it to reduce its weight\. It's a favored weapon of goblins\./i, "Esta espada corta, curva y de tosca manufactura, suele tener agujeros en la hoja para reducir su peso. Es el arma predilecta de los goblins."],
            [/This favored weapon of the dwarves has a large, ornate head mounted on a thick handle\. This powerful axe can be wielded with one hand or two\./i, "Esta arma predilecta de los enanos tiene una cabeza larga y adornada, montada sobre un grueso mango. Esta potente hacha se puede empuñar a una o a dos manos."],
            [/Essentially a longer version of the scimitar, this traditional elven weapon has a thinner blade than its cousin\./i, "Esencialmente una versión más larga de la cimitarra, esta arma tradicional elfa tiene una hoja más delgada que la de la cimitarra."],
            [/This weapon is a heavier, two-handed version of the curved-bladed scimitar\. It is weighted toward the blade's end, making it a powerful slashing weapon\./i, "Esta arma de hoja curva es una versión más pesada y a dos manos de la cimitarra. Tiene más peso hacia el final de la cuchilla, lo que la convierte en una potente arma cortante."],
            [/This halfling weapon looks like a long, two-pronged fork and is used as both a weapon and a cooking implement\./i, "Esta arma de los medianos parece un tenedor largo y con dos puntas y se utiliza (indistintamente) como arma o como instrumento de cocina."],
            [/An unarmed attack\./i, "Un ataque sin armas."],
            [/This weapon consists of a wooden handle attached to a spiked ball or cylinder by a chain, rope, or strap of leather\./i, "Esta arma consiste en un mango de madera fijado a una bola con púas o un cilindro, mediante una cadena, cuerda o tira de cuero."],
            [/A pair of these metal gloves comes with full plate, half plate, and splint armor; they can also be purchased separately and worn with other types of armor\. They not only protect your hands but also transform your hands into lethal weapons\./i, "Un par de estos guantes de metal viene junto a una armadura completa, una de placas y mallas o una laminada; también se pueden comprar por separado y llevarse con otros tipos de armadura. No tan sólo protegen tus manos, sino que también las transforman en armas letales."],
            [/This polearm consists of a long, single-edged blade on the end of a 7-foot pole\. It is extremely effective at delivering lethal cuts at a distance\./i, "Esta arma de asta es una larga cuchilla de un solo filo al final de un asta de 7 pies (2,1 m). Es extremadamente efectiva para propinar cortes letales a distancia."],
            [/More a flail than a mace, this weapon has a short handle attached to a length of chain with a ball at the end\. The ball is propelled to its reach with the flick of the wrist, the momentum of which brings the ball back to the wielder after the strike\./i, "Más un mangual que una maza, esta arma tiene un mango corto fijado a un trozo de cadena con una bola en el extremo. La bola es impulsada hasta su alcance por un giro de la muñeca, el impulso del cual devuelve la bola a quien la empuña después del golpe."],
            [/This gnome tool and weapon features a hammer at one end and a curved pick on the other\. It's such a strange and awkward weapon that others think the gnomes are slightly erratic for using it\./i, "Esta herramienta y arma de los gnomos tiene un martillo en un extremo y un pico curvo en el otro. Es un arma tan extraña e incómoda que los demás piensan que los gnomos son ligeramente erráticos por utilizarla."],
            [/This large battle axe is too heavy to wield with only one hand\. Many greataxes incorporate two blades, and they are often "bearded," having a hook at the bottom to increase the strength of their chopping power\./i, "Esta gran hacha de batalla es demasiado pesada para empuñarla a una mano. Muchas de ellas incorporan dos hojas y a menudo son \"barbadas\", disponiendo de un gancho en la base para aumentar la fuerza de su poder cortante."],
            [/While many greatclubs are intricately carved, others are little more than a sturdy tree branch\. These massive clubs are too heavy to wield with only one hand\./i, "Si bien muchas grandes clavas están intrincadamente talladas, otras son poco más que una recia rama de árbol. Estas enormes clavas son demasiado pesadas como para empuñarlas a una mano."],
            [/This pick has a longer handle and broader head than a regular pick\. It is too heavy to wield in one hand\./i, "Este pico tiene un mango más largo y una cabeza más ancha que un pico normal. Es demasiado pesado para empuñarlo a una mano."],
            [/This immense two-handed sword is nearly as tall as its wielder\. Its lower blade is often somewhat dulled to allow it to be gripped for extra leverage in close-quarter fights\./i, "Esta inmensa espada a dos manos (NdT: a veces llamada montante) es casi tan alta como quien la empuña. La parte de la hoja más cercana a la empuñadura a menudo se afila poco para permitir aferrarla más en combate cerrado."],
            [/This polearm bears a long, often one‑sided, curved blade with a hook protruding from the blunt side of the blade, which can allow its wielder to trip opponents at a distance\. Its shaft is usually 8 feet long\./i, "Esta arma de asta lleva una hoja larga y curva, a menudo de un solo filo, con un gancho que sobresale del lado romo la misma, lo que puede permitir a su portador derribar oponentes a distancia. El asta suele medir unos 8 pies (2,4 m) de largo."],
            [/This polearm has a relatively short, 5-foot shaft\. The business end is a long spike with an axe blade attached\./i, "Esta arma de asta es relativamente corta, unos 5 pies (1,5 m). La parte afilada es una larga púa a la que se ha fijado una hoja de hacha."],
            [/This staff ends in a Y-shaped split that cradles a sling\. The length of the staff provides excellent leverage when used two‑handed to fling rocks or bullets from the sling\./i, "Este bastón acaba en una bifurcación en forma de \"Y\" que aloja una honda. La longitud del bastón proporciona un excelente brazo de palanca cuando se usa a dos manos para lanzar piedras o proyectiles con la honda."],
            [/Sometimes referred to as an alley bow by rogues or ruffians, this small crossbow fires small bolts that are sometimes used to deliver poison to the target\. It's small enough to be shot one-handed, but it still requires two hands to load\./i, "A veces denominada arco de callejón por los pícaros y los rufianes, esta pequeña ballesta dispara virotes igualmente pequeños, que a veces se utilizan para envenenar al objetivo. Es lo suficientemente pequeña como para dispararse a una mano, pero sigues requiriendo ambas manos para cargarla."],
            [/This small axe can be used in close combat or thrown\./i, "Esta pequeña hacha se puede utilizar en combate cerrado o arrojarla."],
            [/This large crossbow is harder to load and more substantial than a regular crossbow, but it packs a greater punch\./i, "Esta gran ballesta es difícil de cargar y pesa más que una ballesta normal, pero tiene más pegada."],
            [/Created by goblins to battle horses, this weapon is essentially a long shaft ending in a blade with a large hook\./i, "Creada por los goblins para luchar contra los caballos, esta arma es esencialmente una larga asta que acaba en una cuchilla provista de un gancho grande."],
            [/This thin spear is well balanced for throwing but is not designed for melee use\./i, "Esta fina lanza está bien equilibrada para arrojarla, pero no está diseñada para uso cuerpo a cuerpo."],
            [/Similar to a sickle and used in some regions to reap grain, a kama has a short, slightly curved blade and a wooden handle\./i, "Similar a una hoz y utilizado en algunas regiones para cosechar el grano, un kama tiene una hoja corta y ligeramente curva y un mango de madera."],
            [/A katana is a curved, single-edged sword known for its wickedly sharped blade\./i, "Una katana es una espada curva y de un solo filo, conocida por lo tremendamente afilado de su hoja."],
            [/Also known as punching daggers, katars are characterized by their H-shaped hand grip that allows the blade to jut out from the knuckles\./i, "También conocidos como puñales, los katar se caracterizan por su empuñadura en forma de \"H\" que permite a la cuchilla sobresalir de los nudillos."],
            [/This staff is topped by a pointed metal circle from which hang several smaller rings that jingle and clang noisily as the staff is moved, allowing you to announce your presence and scare off wild animals as you walk\./i, "Este bastón está rematado por un círculo de metal puntiagudo del que cuelgan varios anillos más pequeños que tintinean y hacen otros sonidos metálicos cuando se mueve, lo que te permite anunciar tu presencia y asustar a los animales salvajes mientras caminas."],
            [/The blade of this foot-long knife curves inward and lacks a cross guard at the hilt\./i, "La hoja de este cuchillo de un pie (30 cm) de longitud se curva hacia dentro y carece de guarda en la empuñadura."],
            [/This spear-like weapon is used by a mounted creature to deal a great deal of damage\./i, "Esta arma parecida a una lanza (pero más larga), la utilizan las criaturas montadas para infligir una gran cantidad de daño."],
            [/This smaller version of the warhammer has a wooden or metal shaft ending in a metal head\. Unlike its heavier cousin, it is light enough to throw\./i, "Esta versión más pequeña del martillo de guerra tiene un mango de metal o de madera que acaba en una cabeza metálica. A diferencia de su primo más pesado, es lo suficientemente ligero como para ser arrojado."],
            [/A light mace has a short wooden or metal shaft ending with a dense metal head\. Used much like a club, it delivers heavy bludgeoning blows, but with extra power derived from the head's metal ridges or spikes\./i, "Una maza ligera tiene un mango corto de madera o de metal que acaba en una densa cabeza metálica. Utilizada en gran medida como una clava, propina golpes muy contundentes, pero con potencia adicional derivada de las rugosidades o púas de metal de que está provista la cabeza."],
            [/A light pick is a modified mining implement with a wooden shaft ending in a pick head crafted more to pierce armor and flesh than chip rocks\./i, "Un pico ligero es una herramienta minera modificada, con un mango de madera que acaba en una cabeza de pico, diseñada más para atravesar armaduras y carne que para partir rocas."],
            [/This 5-foot-tall bow, usually made of a single piece of elm, hickory, or yew, has a powerful draw and is excellent at propelling arrows with great force and at an extreme distance\. You must use two hands to fire a longbow, and it can't be used while mounted\./i, "Este arco de 5 pies (1,5 m) de altura, hecho por lo general a partir de una sola pieza de madera de un nogal o tejo, tiene una fuerte tensión y es excelente para impulsar flechas con gran fuerza y a una distancia extrema. Tienes que usar las dos manos para dispararlo y no se puede utilizar montado."],
            [/This very long spear, sometimes called a pike, is purely for thrusting rather than throwing\. Used by many soldiers and city watch for crowd control and defense against charging enemies, it must be wielded with two hands\./i, "Esta lanza de grandes dimensiones, a veces llamada pica, está diseñada solamente para perforar y no para lanzar. Utilizada por muchos soldados y por la guardia de las ciudades para control de multitudes y defensa contra enemigos a la carga, hay que empuñarla a dos manos."],
            [/Longswords can be one-edged or two‑edged swords\. Their blades are heavy and they're between 3 and 4 feet in length\./i, "Las espadas largas, también conocidas como espadas de armas, pueden ser de filo simple y de doble filo. Tienen la hoja pesada y miden entre 3 y 4 pies (90 cm y 1,2 m) de longitud."],
            [/With a stout haft and a heavy metal head, a mace is sturdy and allows its wielder to deliver powerful blows and dent armor\./i, "Con un recio mango y una pesada cabeza de metal, una maza es recia y permite a quien la empuña asestar poderosos golpes y abollar armaduras."],
            [/This parrying dagger features a robust guard to protect the wielder's hand\./i, "Esta daga de parada dispone de una robusta guarda para proteger la mano de quien la empuña."],
            [/Mauls are massive warhammers that must be swung with two hands\./i, "Los mazos (NdT: también conocidos como atarragas) son enormes martillos de guerra que se tienen que empuñar a dos manos."],
            [/This weapon has a short shaft ending in a metal ball studded with spikes\./i, "Esta arma tiene un mango corto que acaba en una bola de metal tachonada de púas."],
            [/The nunchaku is constructed of two wooden or metal bars connected by a short length of rope or chain\./i, "Un nunchaku está construido a partir de dos barras de madera o de metal, conectadas por un trozo corto de cuerda o de cadena."],
            [/This stout, metal blade of orc design has a horizontal basket hilt with blades jutting from each end, or sometimes one blade like that of a katar\./i, "Esta recia hoja de diseño orco tiene un puño horizontal en forma de cesta del que sobresalen cuchillas a cada extremo o, a veces, una cuchilla como la de un katar."],
            [/This single-bladed bearded axe has a jagged blade that's perfect for separating bone from tendon and cartilage\./i, "Esta hacha barbada de una sola hoja tiene una cuchilla aserrada, perfecta para separar el hueso de los tendones y los cartílagos."],
            [/A pick designed solely for combat has a sturdy wooden shaft and a heavy, pointed head to deliver devastating blows\./i, "Un pico diseñado únicamente para el combate tiene un recio mango de madera y una cabeza pesada y puntiaguda con la que asestar golpes devastadores."],
            [/This polearm is a long trident with a central prong that's longer than the other two\./i, "Esta arma de asta es un tridente largo con una púa central más larga que las otras dos."],
            [/The rapier is a long and thin piercing blade with a basket hilt\. It is prized among many as a dueling weapon\./i, "La ropera es una cuchilla larga y fina, con una empuñadura de cesta (NdT: llamada recazo). Muchos la prefieren como arma para duelos."],
            [/This piercing dagger is a metal spike flanked by a pair of prongs that can be used to trap an enemy's weapon\./i, "Esta daga perforante es una púa de metal, flanqueada por un par de puntas que se pueden utilizar para enganchar la hoja de un enemigo."],
            [/A sap has a soft wrapping around a dense core, typically a leather sheath around a lead rod\. Its head is wider than its grip to disperse the force of a blow, as the weapon's purpose is to knock out its victim rather than to draw blood\./i, "Una cachiporra tiene una cobertura blanda alrededor de un núcleo denso, típicamente una funda de cuero alrededor de una vara de plomo. Tiene la cabeza más ancha que la empuñadura para dispersar la fuerza del golpe, puesto que el propósito del arma es noquear a su víctima en lugar de derramar sangre."],
            [/This curved blade is serrated like a saw, hence the name\./i, "El arma de signatura de los asesinos Mantis Roja, esta hoja curva tiene dientes de sierra y de ahí el nombre."],
            [/This one-handed curved blade is sharp on one side\./i, "Esta espada curva a una mano sólo está afilada por un lado."],
            [/Derived from a farming tool used to mow down long grains and cereals, this weapon has a long wooden shaft with protruding handles, capped with a curved blade set at a right angle\./i, "Derivada de una herramienta agrícola utilizada para segar granos largos y cereales, esta arma tiene un largo mango de madera con asideros sobresalientes, rematado por una cuchilla curva fijada en ángulo recto."],
            [/Your body produces a nearly endless supply of hard seedpods\. You gain a seedpod ranged unarmed attack with a range increment of 30 feet that deals 1d4 bludgeoning damage\. On a critical hit, a seedpod bursts, issuing forth a tangle of vegetation that imposes a –10-foot circumstance penalty on the target’s Speed until the start of your next turn\. Seedpods do not add critical specialization effects\./i, "Tu cuerpo produce un suministro casi interminable de duros tegumentos. Obtienes un ataque sin armas a distancia de tegumento con un incremento de rango de distancia de 30 pies que inflige 1d4 daño contundente. Con un impacto crítico, el tegumento explota, expulsando una maraña de vegetación que impone un penalizador -10 pies por circunstancia a la Velocidad del objetivo hasta el inicio de tu siguiente turno. Los tegumentos no añaden efectos de especialización crítica."],
            [/A shield bash is not actually a weapon, but a maneuver in which you thrust or swing your shield to hit your foe with an impromptu attack\./i, "Un golpe con el escudo no es en realidad un arma, sino una maniobra en la que empujas o haces girar el escudo para atizar a tu enemigo con un ataque improvisado."],
            [/Typically a round, convex, or conical piece of thick metal attached to the center of a shield, a shield boss increases the bludgeoning damage of a shield bash\./i, "Típicamente una pieza redonda, convexa o cónica de grueso metal fijada en el centro del escudo, un umbo incrementa el daño contundente de un golpe con el escudo."],
            [/These metal spikes are strategically placed on the defensive side of the shield to deal piercing damage with a shield bash\./i, "Estas púas de metal están estratégicamente colocadas en el lado defensivo del escudo para infligir daño perforante mediante un golpe con el mismo."],
            [/This smaller bow is made of a single piece of wood and favored by skirmishers and cavalry\./i, "Este pequeño arco está hecho de una sola pieza de madera y es el favorito de los hostigadores y de la caballería."],
            [/These blades come in a variety of shapes and styles, but they are typically 2 feet long\./i, "Estas hojas suelen tener una gran variedad de formas y de estilos, pero miden típicamente 2 pies de longitud."],
            [/This "throwing star" is a small piece of flat metal with sharp edges, designed to be flung with a flick of the wrist\./i, "Esta \"estrella arrojadiza\" es una pequeña pieza de metal plano y bordes afilados, diseñada para lanzarse con un giro de muñeca."],
            [/Originally a farming tool used for reaping grain, this one-handed weapon has a short wooden handle ending in a curved blade, sometimes sharpened on both sides\./i, "Originalmente una herramienta agrícola utilizada para segar el grano, esta arma a una mano tiene un mango corto de madera que acaba en una cuchilla curva, a veces afilada por ambos lados."],
            [/Little more than a leather cup attached to a pair of straps, a sling can be used to fling smooth stones or sling bullets at a range\./i, "Poco más que un trozo de cuero atado a un par de cuerdas, una honda se puede utilizar para lanzar a distancia piedras lisas o balas de honda."],
            [/A long metal shaft ending with a metal spike, a spear can be used one-handed as a melee weapon and can be thrown\./i, "Un largo mango de metal que acaba en una púa metálica, una lanza se puede usar a una mano como arma cuerpo a cuerpo, pero también puede ser arrojada."],
            [/A special attack awarded via a feat or special\./i, "Un ataque especial obtenido por un dote u otra cosa especial."],
            [/This 4‑foot‑long length of chain is covered with barbs and has spikes on one or both ends\. Some feature metal hoops used as handgrips\./i, "Esta cadena de 4 pies de longitud está cubierta de espinas y dispone de púas afiladas en uno o en ambos extremos. Algunas disponen de aros de metal, que se utilizan como asideros."],
            [/Providing the same defensive function as a standard gauntlet, this version has a group of spikes protruding from the knuckles to deliver piercing damage with a punch\./i, "Proporcionando la misma función defensiva que un guantelete normal, esta versión tiene un grupo de púas que sobresalen de los nudillos."],
            [/This long piece of wood can aid in walking and deliver a mighty blow\./i, "Este largo trozo de madera puede ayudar a caminar y además propinar poderosos golpes."],
            [/From a central metal ring, four tapering metal blades extend like points on a compass rose\. When gripping a starknife from the center, the wielder can use it as a melee weapon\. It can also be thrown short distances\./i, "A partir de un aro metálico central, se extienden cuatro cuchillas también metálicas y puntiagudas, como las puntas de una rosa de los vientos. Cuando se empuña un cuchillo de estrella por el centro, quien lo hace lo puede utilizar como arma cuerpo a cuerpo. También se puede lanzar a distancias cortas."],
            [/This heavy blade is favored by guardians of religious sites\. It has a distinctive, crescent-shaped blade that seems to be a mix of a sickle and sword\. It often has holes drilled into the blade or the pommel so that bells or other holy trinkets can be affixed to the weapon as an aid for prayer or mediation\./i, "Esta hoja pesada es la favorita de los guardianes de los lugares religiosos. Tiene una cuchilla distintiva en forma de media luna, que parece una mezcla entre una hoz y una espada. A menudo se han practicado agujeros en la hoja o en la empuñadura para poder colocar campanillas u otras baratijas sagradas."],
            [/This three-pronged, spear-like weapon typically has a 4-foot shaft\. Like a spear, it can be wielded with one hand or thrown\./i, "Esta arma de tres puntas, parecida a una lanza, suele tener un mango de 4 pies de longitud. Igual que una lanza, se puede empuñar a una mano o lanzarse."],
            [/This short-bladed, single-edged sword is typically carried as part of a pair alongside a katana\./i, "Esta espada de hoja corta y un solo filo suele formar parte de una pareja junto a una katana."],
            [/This large flail has a long shaft connected to a shorter piece of stout wood or metal that's sometimes inlaid with spikes\./i, "Este mangual de grandes dimensiones tiene un mango largo, conectado a una pieza más corta de recia madera o de metal, a veces tachonada de púas."],
            [/This weapon has a wooden shaft ending in a large, heavy metal head\. The head of the hammer might be single-sided or double-sided, but it's always capable of delivering powerful bludgeoning blows\./i, "Esta arma tiene un mango de madera que acaba en una cabeza grande y pesada de metal. La cabeza del martillo puede ser sencilla o doble, pero siempre es capaz de propinar fuertes golpes."],
            [/This long strand of thick leather, often braided, delivers a painful but nonlethal slash at a distance, usually accompanied by a distinctive cracking sound\./i, "Este largo trozo de grueso cuero, a menudo trenzado, propina un golpe cortante, doloroso pero no letal, a distancia acompañado por lo general de un chasquido distintivo."],

            // armor descriptions
            [/Plate mail consists of interlocking plates that encase nearly the entire body in a carapace of steel\. It is costly and heavy, and the wearer often requires help to don it correctly, but it provides some of the best defense armor can supply\. A suit of this armor comes with an undercoat of padded armor and a pair of gauntlets\./i, "Una armadura completa consiste en placas metálicas entrelazadas, que cubren casi todo el cuerpo en un caparazón de acero. Es cara y pesada y el portador a menudo requiere ayuda para ponérsela correctamente, pero proporciona la mejor defensa que una armadura puede conceder. Una armadura de este tipo lleva por debajo una armadura acolchada e incluye unos guanteletes."],
            [/A mix of flexible and molded boiled leather, a suit of this type of armor provides some protection with maximum flexibility\./i, "Una mezcla de cuero hervido flexible y moldeado, una armadura de este tipo proporciona algo de protección con una flexibilidad máxima."],
            [/This leather armor is reinforced with metal studs and sometimes small metal plates, providing most of the flexibility of leather armor with more robust protection\./i, "Esta armadura de cuero está reforzada con remaches de metal y a veces pequeñas placas metálicas, proporcionando gran parte de la flexibilidad de una armadura de cuero, pero con una protección más robusta."],
            [/A mix of furs, sturdy hide, and sometimes molded boiled leather, this armor provides protection due to its layers of leather, though its bulkiness slows the wearer down and decreases mobility\./i, "Una mezcla de pelaje de animal, piel gruesa y a veces cuero hervido moldeado, esta armadura proporciona protección debido a sus capas de cuero, aunque su volumen lentifica al portador y reduce su movilidad."],
            [/Half plate consists of most of the upper body plates used in full plate, with lighter or sparser steel plate protection for the arms and legs\. This provides some of the protection of full plate with greater flexibility and speed\. A suit of this armor comes with an undercoat of padded armor and a pair of gauntlets\./i, "La armadura de placas y mallas consiste en la mayoría de las placas metálicas utilizadas en una armadura completa, con una protección más ligera o menor para brazos y piernas. Esto proporciona parte de la protección de la armadura completa, permitiendo mayor flexibilidad y velocidad. Una armadura de este tipo lleva por debajo una armadura acolchada e incluye unos guanteletes."],
            [/This type of armor is chain mail reinforced with flexible, interlocking metal plates, typically located on the wearer’s torso, upper arms, and legs\. A suit of this armor comes with an undercoat of padded armor and a pair of gauntlets\./i, "Este tipo de armadura es una cota de malla reforzada con placas de metal flexibles y entrelazadas, situadas típicamente en el torso, los brazos y las piernas del portador. Una armadura de este tipo lleva por debajo una armadura acolchada y unos guanteletes."],
            [/Sometimes called a hauberk, this is a long shirt constructed of the same metal rings as chainmail\. However, it is much lighter than chainmail and protects only the torso, upper arms, and upper legs of its wearer\./i, "A veces denominado joruca, se trata de una camisa larga construida con los mismos anillos de metal que una cota de malla. Sin embargo, es mucho más ligero que la cota de malla y sólo protege el torso, los brazos y los muslos de su portador."],
            [/Though referred to as a breastplate, this type of armor consists of several pieces of plate or half-plate armor that protect the torso, chest, neck, and sometimes the hips and lower legs\. It strategically grants some of the protection of plate while allowing greater flexibility and speed\./i, "A pesar de su nombre, este tipo de armadura consiste en diversas piezas de armadura completa o armadura de placas y mallas que protegen el torso, el pecho, el cuello y a veces las caderas y las piernas. Estratégicamente concede parte de la protección de la armadura completa permitiendo mayor flexibilidad y velocidad."],
            [/Scale mail consists of many metal scales sewn onto a reinforced leather backing, often in the form of a long shirt that protects the torso, arms, and legs\./i, "Una cota de escamas consiste en muchas escamas metálicas cosidas a una base de cuero reforzado, a menudo en forma de una camisa larga (o jubón) que protege el torso, los brazos y las piernas."],
            [/A suit of chain mail consists of several pieces of armor composed of small metal rings linked together in a protective mesh\. It typically includes a chain shirt, leggings, a pair of arms, and a coif, collectively protecting most of the body\./i, "Una cota de malla consiste en varias piezas de armadura compuestas de pequeños anillos metálicos entrelazados formando una malla protectora. Suele incluir un camisote de malla, grebas, brazales y una escarcela, protegiendo colectivamente la mayor parte del cuerpo."],
            [/This armor is simply a layer of heavy, quilted cloth, but it is sometimes used because it’s so inexpensive\. Padded armor is easier to damage and destroy than other types of armor\. Heavy armor comes with a padded armor undercoat included in its Price, though it loses the comfort trait when worn under heavy armor\. You can wear just that padded armor undercoat to sleep in, if your heavy armor is destroyed, or when otherwise not wearing the full heavy armor\. This allows you to keep the armor invested and benefit from the power of any runes on the associated heavy armor, but no one else can wear your heavy armor without the padded undercoat\./i, "Esta armadura (NdT: comúnmente denominada gambesón) es simplemente una capa de tela gruesa y guateada, pero a veces se usa porque es muy barata. La ropa acolchada es más fácil de dañar y destruir que otros tipos de armadura. Las armaduras pesadas vienen con una capa interior de ropa acolchada incluida en el Precio, aunque ésta última pierde el rasgo cómoda cuando se lleva bajo una armadura pesada. Para dormir, si tu armadura pesada resulta destruida o cuando por lo demás no llevas la armadura pesada completa, puedes llevar tan sólo tu ropa acolchada. Eso te permite mantener investida la armadura mágica y beneficiarte del poder de cualesquiera runas de la armadura pesada asociada, pero nadie más puede llevar tu armadura pesada sin la capa interior acolchada."],
            [/Adventurers who don’t wear armor travel in durable clothing\. Though it’s not armor and uses your unarmored defense proficiency, it still has a Dex Cap and can grant an item bonus to AC if etched with potency runes\./i, "Los aventureros que no llevan armadura viajan equipados con ropa duradera. Aunque no se trata de armadura y utiliza tu competencia en defensa sin armadura, sigue teniendo un tope por Des y puede conceder un bonificador por objeto a la CA si se le graban runas de potencia"],
            [/Wearing no armor\./i, "No llevas armadura."],

            // gear descriptions
            [/These four-pronged metal spikes can damage a creature’s feet\. You can scatter caltrops in an empty square adjacent to you with an Interact action\. The first creature that moves into that square must succeed at a DC 14 Acrobatics check or take 1d4 piercing damage and 1 persistent bleed damage\. A creature taking persistent bleed damage from caltrops takes a –5-foot penalty to its Speed\. Spending an Interact action to pluck the caltrops free reduces the DC to stop the bleeding\. Once a creature takes damage from caltrops, enough are ruined that other creatures moving into the square are safe\. Deployed caltrops can be salvaged and reused if no creatures took damage from them\. Otherwise, enough are ruined that they can’t be salvaged\./i, "Estas púas de metal de cuatro puntas pueden dañar los pies de una criatura. Puedes esparcir abrojos en una casilla vacía adyacente a ti con una acción de Interactuar. La primera criatura que se mueve a dicha casilla tiene que superar una prueba de Acrobacias CD 14 o sufrir 1d4 daño perforante y 1 daño persistente por sangrado. Una criatura que sufre daño persistente por sangrado debido a los abrojos sufre un penalizador -5 a su Velocidad. Invertir una acción de Interactuar para quitarse los abrojos reduce la CD para detener el sangrado. Una vez que una criatura haya sufrido daño debido a los abrojos, se habrán gastado los suficientes como para que otras criaturas que muevan a dicha casilla estén seguras. Los abrojos desplegados se pueden recuperar y reutilizar si ninguna criatura sufre daño debido a los mismos. De lo contrario, se gastan tantos que no se puede recuperar nada."],
            [/You can use oil to fuel lanterns, but you can also set a pint of oil aflame and throw it\. You must first spend an Interact action preparing the oil, then throw it with another action as a ranged attack\. If you hit, it splatters on the creature or in a single 5-foot square you target\. You must succeed at a DC 10 flat check for the oil to ignite successfully when it hits\. If the oil ignites, the target takes 1d6 fire damage\./i, "Puedes utilizar el aceite para encender linternas, pero también puedes prenderle fuego a 1 pinta (0,5 l) de aceite y lanzarla. Debes primero invertir una acción de Interactuar preparando el aceite, y después lanzarlo con otra acción como un ataque a distancia. Si aciertas, salpica a la criatura o a un solo cuadrado de 5 pies (1,5 m) de lado al que designas como objetivo. Has de tener éxito en una prueba plana CD 10 para que el aceite se encienda con éxito cuando impacta. Si el aceite se enciende, el objetivo sufre 1d6 daño por fuego."],
            [/Saddlebags come in a pair\. Each can hold up to 3 Bulk of items, and the first 1 Bulk of items in each doesn’t count against your mount’s Bulk limit\. The Bulk value given is for saddlebags worn by a mount\. If you are carrying or stowing saddlebags, they count as 1 Bulk instead of light Bulk\./i, "Las alforjas vienen por parejas. Cada una puede contener hasta Impedimenta 3 en objetos, pero la primera Impedimenta 1 de objetos en cada una no cuenta contra el límite de Impedimenta de tu montura. El valor de Impedimenta que se da es para unas alforjas puestas en una montura. Si las llevas tú o las llevas guardadas, cuentan como Impedimenta 1 en lugar de ligera."],
            [/A torch sheds bright light in a 20-foot radius \(and dim light to the next 20 feet\) for 1 hour\. It can be used as an improvised weapon that deals 1d4 bludgeoning damage plus 1 fire damage\./i, "Una antorcha emite luz brillante en un radio de 20 pies (6 m) y luz tenue en los siguientes 20 pies (6 m) durante 1 hora. Se puede usar como arma improvisada que inflige 1d4 daño contundente mas 1 daño por fuego."],
            [/Tack includes all the gear required to outfit a riding animal, including a saddle, bit and bridle, and stirrups if necessary\. Especially large or oddly shaped animals might require specialty saddles\. These can be more expensive or hard to find, as determined by the GM\. The Bulk value given is for tack worn by a creature\. If carried, the Bulk increases to 2\./i, "Los arreos incluyen todo el equipo necesario para equipar a un animal de monta, incluyendo una silla de montar, brida y bocado y estribos si es necesario. Los animales especialmente grandes o de forma extraña podrían requerir sillas de montar especializadas. Este material podría ser más caro o más difícil de encontrar, a criterio del DJ. El valor de Impedimenta que se da es para unos arreos puestos en una criatura. Si se transportan, la Impedimenta se incrementa a 2."],
            [/A compass helps you Sense Direction or navigate, provided you’re in a location with uniform magnetic fields\. Without a compass, you take a –2 item penalty to these checks \(similar to using a shoddy item\)\. A lensatic compass gives you a \+1 item bonus to these checks\./i, "Una brújula te ayuda a Sentir la dirección o a orientarte, si estás en un lugar donde los campos magnéticos son uniformes. Sin una de ellas, sufres un penalizador -2 por objeto a dichas pruebas (similar a estar usando un objeto de baja calidad). Una brújula de lente y dial te concede un bonificador +1 por objeto a estas pruebas."],
            [/You can pull a dueling cape you’re wearing from your shoulder and wrap it around your arm with an Interact action\. While wielding the dueling cape this way, the cape uses that arm and hand, and you can’t hold anything else in that hand\. While you do so, you can spend an action to hold it in a protective position, giving you a \+1 circumstance bonus to AC and to Deception checks to Feint until the start of your next turn\./i, "Te puedes quitar una capa de duelo que llevas puesta y enrollarla alrededor de tu brazo con una acción de Interactuar. Mientras llevas la capa de duelo de esa forma, esa mano y ese brazo están ocupados y no puedes sostener nada más. Mientras lo haces, puedes invertir una acción para sostenerla en una posición protectora, lo que te concede un bonificador +1 por circunstancia a la CA y a las pruebas de Engaño para Fintar hasta el inicio de tu siguiente turno."],
            [/A typical spyglass lets you see eight times farther than normal\. A fine spyglass adds a \+1 item bonus to Perception checks to notice details at a distance\./i, "Un catalejo típico te permite ver ocho veces más lejos de lo normal. Un catalejo de gran calidad suma un bonificador +1 por objeto a las pruebas de Percepción para ver detalles a distancia."],
            [/Picking a poor lock requires two successful DC 15 Thievery checks, a simple lock requires three successful DC 20 Thievery checks, an average lock requires four successes at DC 25, a good lock requires five successes at DC 30, and a superior lock six successes at DC 40\./i, "Forzar una cerradura barata requiere dos pruebas con éxito de Latrocinio CD 15, una sencilla requiere tres éxitos a CD 20, una normal requiere cuatro éxitos a CD 25, una buena requiere cinco éxitos a CD 30 y una superior, seis éxitos a CD 40."],
            [/A wooden chest can hold up to 8 Bulk of items./i, "Un cofre de madera puede almacenar hasta Impedimenta 8 en objetos."],
            [/Scholarly journals are uncommon\. Each scholarly journal is a folio on a very specific topic, such as vampires or the history of a single town or neighborhood of a city\. If you spend 1 minute referencing an academic journal before attempting a skill check to Recall Knowledge about the subject, you gain a \+1 item bonus to the check\. A compendium of journals costs five times as much as a single journal and requires both hands to use; each compendium contains several journals and grants its bonus on a broader topic, such as all undead or a whole city\. The GM determines what scholarly journals are available in any location\./i, "Los diarios de erudito son poco comunes. Cada uno de ellos es un libro de tamaño folio sobre un tema específico, como por ejemplo los vampiros o la historia de una sola población o de un barrio de una ciudad. Si inviertes 1 minuto consultando un diario de erudito antes de hacer una prueba de habilidad para Recordar conocimiento acerca del tema, obtienes un bonificador +1 por objeto a la prueba. Un compendio de diarios cuesta cinco veces lo que un solo diario y se ha de sostener a dos manos; cada compendio contiene diversos diarios y concede su bonificador sobre un tema más amplio, como por ejemplo todos los muertos vivientes o una ciudad entera. El DJ es quien determina qué diarios de erudito hay disponibles en cualquier lugar."],
            [/This item is the starter kit for an adventurer, containing the essential items for exploration and survival\. The Bulk value is for the entire pack together, but see the descriptions of individual items as necessary\./i, "Éste es el conjunto inicial para un aventurero y contiene los objetos esenciales para la exploración y la supervivencia. El valor de Impedimenta es para el conjunto del equipo, pero consulta la descripción de los objetos individuales si es necesario."],
            [/The pack contains the following items: backpack \(containing the other goods\), bedroll, 10 pieces of chalk, flint and steel, 50 feet of rope, 2 weeks' rations, soap, 5 torches, and a waterskin\./i, "El equipo contiene los siguientes objetos: una mochila (que contiene los demás objetos), un saco de dormir, 10 trozos de tiza, pedernal y yesca, 50 pies (15 m) de cuerda, raciones para 2 semanas, jabón, 5 antorchas y un odre."],
            [/A repair toolkit allows you to perform simple repairs while traveling\. It contains a portable anvil, tongs, woodworking tools, a whetstone, and oils for conditioning leather and wood\. You can use a repair toolkit to Repair items using the Crafting skill\. A superb repair kit gives you a \+1 item bonus to the check\. You can draw and replace a worn repair toolkit as part of the action that uses it\./i, "Un equipo de reparaciones te permite llevar a cabo reparaciones sencillas cuando viajas. Contiene un yunque portátil, tenazas, herramientas de carpintero, una piedra de amolar y aceites para tratar el cuero y la madera. Puedes utilizar un equipo de reparaciones para Reparar objetos utilizando la habilidad Artesanía. Un equipo de reparaciones soberbio te concede un bonificador +1 por objeto a la prueba. Puedes reemplazar un equipo de reparaciones gastado por uno nuevo como parte de la acción que lo utiliza."],
            [/You can throw a grappling hook with a rope tied to it to make a climb easier\. To anchor a grappling hook, make a ranged attack roll using your simple weapon proficiency against a DC depending on the target, typically at least DC 20\. This attack has the secret trait\. On a success, your hook has a firm hold, but on a critical failure, the hook seems like it will hold but actually falls when you’re partway up\./i, "Puedes lanzar un garfio de abordaje con una cuerda atada al mismo para hacer más fácil una escalada. Para anclar un garfio de abordaje, haz una tirada de ataque a distancia utilizando tu competencia con armas sencillas contra una CD que depende del objetivo, típicamente por lo menos CD 20. Este ataque tiene el rasgo secreto. Con un éxito, tu garfio queda firmemente anclado, aunque con un fallo crítico parece como si fuera a aguantar, pero en realidad se suelta cuando estás a media subida."],
            [/You can manacle someone who is willing or otherwise at your mercy as an exploration activity taking 10–30 seconds depending on the creature’s size and how many manacles you apply\. A two-legged creature with its legs bound takes a –15-foot circumstance penalty to its Speeds, and a two-handed creature with its wrists bound has to succeed at a DC 5 flat check any time it uses a manipulate action or else that action fails\. This DC may be higher depending on how tightly the manacles constrain the hands\. A creature bound to a stationary object is immobilized\. For creatures with more or fewer limbs, the GM determines what effect manacles have, if any\. Freeing a creature from poor manacles requires two successful DC 17 Thievery checks, simple manacles requires three successes at DC 22, average manacles require four successes at DC 27, good manacles require five successes at DC 32, and superior manacles require six successes at DC 42\./i, "Puedes ponerle unos grilletes a alguien con su consentimiento o si está a tu merced como una actividad de exploración que dura entre 10 y 30 segundos dependiendo del tamaño de la criatura y de cuántos grilletes le pongas. Una criatura de dos piernas con las piernas ligadas sufre un penalizador -15 pies (4,5 m) por circunstancia a sus Velocidades y una criatura de dos manos con ellas ligadas tiene que tener éxito en una prueba plana CD 5 cada vez que utiliza una acción de manipular, o la acción falla. Esta CD puede ser mayor dependiendo de con qué fuerza se han ajustado los grilletes para inmovilizar las manos. Una criatura atada a un objeto estacionario está inmovilizada. Para las criaturas con más o menos extremidades, el DJ es quien determina qué efectos tienen los grilletes, si lo tienen. Liberar a una criatura de unos grilletes baratos requiere dos éxitos en sendas pruebas de Latrocinio CD 17, unos sencillos requieren tres éxitos a CD 22, unos normales requieren cuatro éxitos a CD 27, unos buenos requieren cinco éxitos a CD 32 y unos superiores requieren seis a CD 42."],
            [/This entry is a catchall for basic hand tools that don’t have a specific adventuring purpose\. A hoe, shovel, or sledgehammer is a long tool, and a hand drill, ice hook, or trowel is a short tool\. A tool can usually be used as an improvised weapon, dealing 1d4 damage for a short tool or 1d6 for a long tool\. The GM determines the damage type that’s appropriate or adjusts the damage if needed\./i, "Esta entrada es un cajón de sastre para las herramientas de mano básicas que no tienen un propósito aventurero específico. Una azada, una pala o un martillo pilón son herramientas largas, y un berbiquí, un gancho para hielo o una paleta son herramientas cortas. Una herramienta se suele poder utilizar como arma improvisada, infligiendo 1d4 daño para una corta o 1d6 para una larga. El DJ es quien determina el tipo de daño apropiado o ajusta la cantidad si es necesario."],
            [/Handheld instruments include bagpipes, a small set of chimes, small drums, fiddles and viols, flutes and recorders, small harps, lutes, trumpets, and similarly sized instruments\. The GM might rule that an especially large handheld instrument \(like a tuba\) has greater Bulk\. Heavy instruments such as large drums, a full set of chimes, and keyboard instruments are less portable and generally need to be stationary while being played\. A virtuoso instrument is more finely made and gives a \+1 item bonus to Performance checks using that instrument\./i, "Los instrumentos de mano incluyen gaitas, un carillón pequeño, tamboriles, violines y violas, flautas dulces y traveseras, arpas pequeñas, laúdes, trompetas e instrumentos de tamaño similar. El DJ podría establecer que un instrumento de mano especialmente grande (como una tuba) tiene una Impedimenta mayor. Los instrumentos pesados, como los tambores grandes, un carillón completo y los instrumentos de teclado son menos portátiles y por lo general requieren permanecer estacionarios cuando se tocan. Un instrumento de virtuoso está más finamente construido y concede un bonificador +1 por objeto a las pruebas de Interpretación utilizándolo."],
            [/This mobile collection of vials and chemicals can be used for simple alchemical tasks\. If you wear your alchemist’s toolkit, you can draw and replace them as part of the action that uses them\./i, "Esta colección móvil de viales y productos químicos se puede utilizar para tareas alquímicas sencillas. Si llevas puesto tu juego de herramientas de alquimista, puedes quitarlas y ponerlas como parte de la acción que las utiliza."],
            [/You need this toolkit to create items from raw materials with the Craft skill\. A sterling artisan’s toolkit gives you a \+1 item bonus to the check\. Different sets are needed for different work, as determined by the GM; for example, a blacksmith’s toolkit differs from a woodworker’s toolkit\. If you wear your artisan’s toolkit, you can draw and replace it as part of the action that uses it\./i, "Necesitas este juego de herramientas para crear objetos a partir de materia prima con la habilidad Artesanía. Un juego de herramientas de artesano excelentes te concede un bonificador +1 por objeto a la prueba. Hacen falta juegos diferentes para trabajos diferentes, a juicio del DJ; por ejemplo un juego de herramientas de herrero es diferente al de un carpintero. Si llevas puesto tu juego de herramientas de artesano, puedes quitarlas y ponerlas como parte de la acción que las utiliza."],
            [/You need a thieves’ toolkit to Pick Locks or Disable Devices \(of some types\) using the Thievery skill\. An infiltrator thieves’ toolkit adds a \+1 item bonus to checks to Pick Locks and Disable Devices\. If your thieves’ toolkit is broken, you can repair it by replacing the lock picks with replacement picks appropriate to your toolkit; this doesn’t require using the Repair action\. If you wear your thieves’ toolkit, you can draw and replace it as part of the action that uses it\./i, "Necesitas un juego de herramientas de ladrón para Forzar cerraduras o Inutilizar mecanismos (de algunos tipos) mediante la habilidad Latrocinio. Un juego de herramientas de ladrón infiltrador añaden un bonificador +1 por objeto a las pruebas para Forzar cerraduras e Inutilizar mecanismos. Si se rompe el juego puedes repararlo cambiando las ganzúas por otras de repuesto; esto no requiere utilizar la acción de Reparar. Si sostienes tu juego de herramientas de ladrón, puedes poner y sacar cosas como parte de la acción que las utiliza."],
            [/If your thieves’ toolkit is broken, you can repair it by replacing the lock picks with replacement picks appropriate to your toolkit;\./i, "Si se rompe el juego puedes repararlo cambiando las ganzúas por otras de repuesto."],
            [/You need an alchemist's lab to Craft alchemical items during downtime\./i, "Necesitas un laboratorio de alquimista para Elaborar sustancias alquímicas durante el tiempo libre."],
            [/An expanded alchemist's lab gives a \+1 item bonus to Crafting checks to create alchemical items\./i, "Un laboratorio de alquimista mejorado te concede un bonificador +1 por objeto a las pruebas de Artesanía para elaborar sustancias alquímicas."],
            [/This book contains the formulas for Crafting the 0-level common items\./i, "Este libro contiene las fórmulas para Elaborar todos los objetos comunes de nivel 0."],
            [/A spellbook holds the written knowledge necessary to learn and prepare various spells, a necessity for wizards \(who typically get one for free\) and a useful luxury for other spellcasters looking to learn additional spells\. Each spellbook can hold up to 100 spells\. The Price listed is for a blank spellbook\./i, "Un libro de conjuros contiene el conocimiento escrito necesario para aprender y preparar diversos conjuros, algo necesario para los magos (que suelen obtener uno gratis) y un lujo útil para otros lanzadores de conjuros que buscan aprender conjuros adicionales. Cada libro puede albergar hasta 100 conjuros. El Precio indicado es para un libro en blanco."],
            [/A formula book holds the formulas necessary to make items other than the common equipment from this chapter; characters of the alchemist class \(Player Core 2\) typically get one for free\. Each formula book can hold the formulas for up to 100 different items\. Formulas can also appear on parchment sheets, tablets, and almost any other medium; there’s no need for you to copy them into a specific book as long as you can keep them on hand to reference them\./i, "Un libro de fórmulas contiene las fórmulas necesarias para crear objetos diferentes al equipo común de este capítulo; los personajes de la clase alquimista suelen obtener uno gratuitamente. Cada libro de fórmulas puede albergar la fórmula de hasta 100 objetos diferentes. Las fórmulas también pueden aparecer en hojas de pergamino, tablillas y casi cualquier otro medio; no hay necesidad de que las copies a un libro específico si las puedes tener a mano para consultarlas."],
            [/A lantern sheds bright light and requires 1 pint of oil to function for 6 hours\. A bull’s-eye lantern emits its light in a 60-foot cone \(and dim light in the next 60 feet\)\. A hooded lantern sheds light in a 30-foot radius \(and dim light in the next 30 feet\) and is equipped with shutters, which you can close to block the light\. Closing or opening the shutters takes an Interact action\./i, "Una linterna emite luz brillante y requiere 1 pinta (0,5 l) de aceite para funcionar durante 6 horas. Una linterna de ojo de buey emite su luz en un cono de 60 pies (18 m), y luz tenue en los siguientes 60 pies (18 m). Una linterna sorda emite luz en un radio de 30 pies (9 m), y luz tenue en los siguientes 30 pies (9 m) y va equipada con obturadores que puedes cerrar para bloquear la luz. Abrir o cerrar los obturadores requiere una acción de Interactuar."],
            [/This quality handheld lens gives you a \+1 item bonus to Perception checks to notice minute details of documents, fabric, and the like\./i, "Esta lente de calidad que se puede empuñar te concede un bonificador +1 por objeto a las pruebas de Percepción para notar detalles minúsculos de documentos, telas, etc."],
            [/Maps are uncommon\. Most maps you can find are simple and functional\. A survey map details a single location in excellent detail\. One of these maps gives you a \+1 item bonus to Survival checks and any skill checks to Recall Knowledge, provided the checks are related to the location detailed on the map\. Maps sometimes come in atlases, containing a number of maps of the same quality, often on similar topics\. An atlas costs five times as much as a single map and requires both hands to use\. The GM determines what maps are available in any location\./i, "Los mapas son poco comunes. La mayoría de los que puedes encontrar son sencillos y funcionales. Un mapa topográfico detalla una sola ubicación con un nivel de detalle excelente. Uno de estos mapas te concede un bonificador +1 por objeto a las pruebas de Supervivencia y a cualquier prueba de habilidad para Recordar conocimiento, si está relacionada con la ubicación detallada en el mapa. Los mapas a veces se presentan en forma de atlas, que contienen cierto número de mapas de la misma calidad, a menudo sobre temas similares. Un atlas cuesta cinco veces más que un solo mapa y requiere ambas manos para utilizarlo. El DJ es quien determina qué mapas hay disponibles en cualquier lugar."],
            [/This kit of bandages, herbs, and suturing tools is necessary for Medicine checks to Administer First Aid, Treat Disease, Treat Poison, or Treat Wounds\. Expanded healer’s toolkits provide a \+1 item bonus to such checks\. If you wear your healer’s toolkit, you can draw and replace them as part of the action that uses them\./i, "Este conjunto de vendajes, hierbas y suturas es necesario para las pruebas de Medicina a fin de administrar Primeros auxilios, Tratar enfermedades, Tratar veneno o Tratar heridas. El material mejorado te proporciona un bonificador +1 por objeto a dichas pruebas. Si llevas puesto tu material de curas, puedes meter y sacar cosas como parte de la acción que lo utiliza."],
            [/This leather satchel contains empty vials, a pair of tweezers, a supply of small linen cloths, a set of brass calipers and a knotted string for measuring distances, several pieces of chalk, a pen, and a blank notebook for keeping notes\. Every component of a detective’s kit is of exceeding quality, and thus a detective’s kit adds a \+1 item bonus to checks to investigate a crime scene, a clue, or similar details\. Like other tool kits, a detective’s kit uses one hand if wearing the kit and two hands otherwise\./i, "Este morral de cuero contiene unos cuantos viales vacíos, unas pinzas, paños de lino pequeños, un juego de calibradores de bronce y un bramante anudado para medir distancias, varios trozos de tiza, una pluma y un bloc de notas en blanco. Todos los componentes del material de detective son de calidad excelente y por lo tanto suman un bonificador +1 por objeto a las pruebas para investigar la escena de un crimen, una pista o detalles similares. Como otros juegos de herramientas, el material de detective utiliza una mano si se lleva puesto y ambas de lo contrario."],
            [/This small wooden box contains cosmetics, false facial hair, spirit gum, and a few simple wigs\. You usually need a disguise kit to set up a disguise in order to Impersonate someone using the Deception skill\. An elite disguise kit adds a \+1 item bonus to relevant checks\. If you’ve crafted a large number of disguises, you can replenish your cosmetics supply with replacement cosmetics suitable for the type of your disguise kit\. You can draw and replace a worn disguise kit as part of the action that uses it\./i, "Esta cajita de madera contiene cosméticos, vello facial falso, goma líquida y unas cuantas pelucas sencillas. Por lo general necesitas material de disfraz para Imitar a otra persona mediante el uso de la habilidad Engaño. Un material de élite suma un bonificador +1 por objeto a las pruebas relevantes. Si has fabricado un gran número de disfraces, puedes completar tu suministro de cosméticos con otros de repuesto adecuados al tipo de tu material de disfraz. Si lo llevas puesto, puedes poner y quitar el material como parte de la acción que lo utiliza."],
            [/You can replenish your cosmetics supply with replacement cosmetics suitable for the type of your disguise kit./i, "Puedes completar tu suministro de cosméticos con otros de repuesto adecuados al tipo de tu material de disfraz."],
            [/This satchel includes 50 feet of rope, pulleys, a dozen pitons, a hammer, a grappling hook, and one set of crampons\. Climbing kits allow you to attach yourself to the wall you’re Climbing, moving half as quickly as usual \(minimum 5 feet\) but letting you attempt a DC 5 flat check whenever you critically fail to prevent a fall\. You gain a \+1 item bonus to Athletics checks to Climb while using an extreme climbing kit\. A single kit has only enough materials for one climber; each climber needs their own kit\. If you wear your climbing kit, you can access it as part of a Climb action\./i, "Este morral contiene 50 pies (15 m) de cuerda, poleas, una docena de pitones, un martillo, un garfio de abordaje y un juego de crampones. El material de escalada te permite fijarte a la pared que estás Trepando, moviéndote la mitad de lo habitual (mínimo 5 pies [1,5 m]) y permitiéndote hacer una prueba plana CD 5 siempre que fallas críticamente para evitar una caída. Obtienes un bonificador +1 por objeto a las pruebas de Atletismo para Trepar si utilizas material de escalada extrema. Uno de estos morrales contiene material para tan sólo un escalador; cada uno necesita el suyo. Si lo llevas puesto, puedes acceder a él como parte de la acción de Trepar."],
            [/Using a writing set, you can draft correspondence and scribe scrolls\. A set includes stationery, including a variety of paper and parchment, as well as ink, a quill or ink pen, sealing wax, and a simple seal\. If you’ve written a large amount, you can refill your kit with extra ink and paper\./i, "Utilizando material de escritura, puedes redactar correspondencia e inscribir pergaminos. Un juego incluye papel y sobres, con una gran variedad de papeles y pergaminos, así como tinta, un cálamo o pluma, lacre y un sello sencillo. Si has escrito mucho, puedes rellenar el juego con tinta y papel de repuesto."],
            [/This kit include a collapsible fishing pole, fishhooks, line, lures, and a fishing net\. Professional fishing tackle grants a \+1 item bonus to checks to fish\./i, "Esto incluye una caña de pescar plegable, anzuelos, sedal, cebos y una red de pesca. El material de pesca profesional concede un bonificador +1 por objeto a las pruebas para pescar."],
            [/A backpack holds up to 4 Bulk of items, and the first 2 Bulk of these items don’t count against your Bulk limits\. If you’re carrying or stowing the pack rather than wearing it on your back, its Bulk is light instead of negligible\./i, "Una mochila contiene hasta Impedimenta 4 de objetos y los primeros 2 puntos de Impedimenta de dichos objetos no cuentan contra tu límite. Si, en lugar de llevar la mochila a la espalda, la sostienes o la llevas guardada, su Impedimenta es ligera en lugar de insignificante."],
            [/When it’s full, a waterskin contains roughly 1 day’s worth of water for a Small or Medium creature\./i, "Cuando está lleno, un odre contiene aproximadamente la cantidad necesaria de agua de 1 día para una criatura Pequeña o Mediana."],
            [/A brass ear is a short, flared tube with one end narrow enough to comfortably fit against the ear canal\. When using it to listen through a door, window, thin wall, or similar barrier, if the barrier would normally increase the DC of your Perception check to hear sounds on the other side, the DC increases by only half as much as normal\. It’s not suitable for improving your hearing in general, a role better served by a hearing aid\./i, "Una oreja de bronce es un tubo corto y acampanado con un extremo lo suficientemente estrecho para introducirlo cómodamente en un oído. Cuando se usa para escuchar a través de una puerta, ventana, pared delgada o barrera similar, si la barrera incrementaría normalmente la CD de tu prueba de Percepción para oír sonidos al otro lado, sólo lo hace en la mitad de lo normal. No es adecuada para mejorar tu audición en general, porque para eso va mejor un audífono."],
            [/When Forcing Open an object that doesn’t have an easy grip, a crowbar makes it easier to gain the necessary leverage\. Without a crowbar, prying something open takes a –2 item penalty to the Athletics check to Force Open\. A levered crowbar grants you a \+1 item bonus to Athletics checks to Force Open anything that can be pried open\./i, "Cuando se Abre a la fuerza un objeto que no se puede agarrar fácilmente, una palanqueta hace más fácil obtener el brazo de palanca necesario. Sin una palanqueta, la prueba de Atletismo para Abrir algo a la fuerza sufre un penalizador -2 por objeto. Una palanqueta reforzada te concede un bonificador +1 por objeto a las pruebas de Atletismo para Abrir por la fuerza cualquier cosa que se puede abrir así."],
            [/Flint and steel are useful in creating a fire if you have the time to catch a spark, though using them is typically too time-consuming to be practical during an encounter\. Even in ideal conditions, using flint and steel to light a flame requires using at least 3 actions, and often significantly longer\./i, "El pedernal y la yesca se utilizan para encender fuego si tienes tiempo para utilizar una chispa aunque usarlos suele alargarse, de forma que el método no es práctico durante un encuentro. Incluso en las condiciones ideales, utilizar el pedernal y la yesca para encender una llama requiere el uso de por lo menos 3 acciones, y a menudo mucho más."],
            [/This is a 2-foot-long tube with two angled mirrors, one at each end\. When the mirrors are aligned correctly, you can look around obstacles while remaining behind cover\. This doesn’t provide a sufficient line of effect to target creatures around corners\./i, "Esto es un tubo de 2 pies (60 cm) de longitud con dos espejos angulados, uno en cada extremo. Cuando los espejos están correctamente alineados, puedes mirar alrededor de un obstáculo desde detrás de una cobertura. Esto no proporciona una línea de efecto suficiente para designar como objetivo a una criatura alrededor de una esquina."],
            [/When wielding this long pole, you can use Seek to search a square up to 10 feet away\. The pole is not sturdy enough to use as a weapon\./i, "Cuando empuñas esta larga pértiga puedes Buscar para sondear una casilla hasta a 10 pies (3 m) de distancia. La pértiga no es lo suficientemente recia como para utilizarla como arma."],
            [/These small spikes can be used as anchors to make climbing easier\. To affix a piton, you must hold it in one hand and use a hammer to drive it in with your other hand\. You can attach a rope to the hammered piton so that you don’t fall all the way to the ground on a critical failure while Climbing\./i, "Estas pequeñas púas se pueden utilizar como anclajes para trepar con más facilidad. Para fijar un pitón, tienes que sostenerlo en una mano y utilizar un martillo para clavarlo con la otra. Puedes fijar una cuerda al pitón clavado para no caer al suelo si sufres un fallo crítico mientras Trepas."],
            [/You can use a net either on its own or attached to a rope\. When attached to a rope, you can use the net to Grapple a Medium or smaller creature up to 10 feet away \(instead of only adjacent creatures\)\. You can continue to Grapple to keep your hold on the target so long as the target remains within 10 feet and you continue to hold the net\. The grabbed creature gains a \+2 circumstance bonus to Escape unless you are adjacent to them, and it can attempt a DC 16 Athletics check to Force Open the net entirely\. Once the target is no longer grabbed, the net is unwieldy until refolded with an Interact action with the concentrate trait that requires two hands; if used without being refolded, Grapple checks made with the net take a –2 penalty\. When the net is unattached, you can attempt a ranged attack roll using your simple weapon proficiency against a Medium or smaller creature within 20 feet\. On a hit, the target is off-guard and takes a –10-foot circumstance penalty to its Speeds until it Escapes, and on a critical hit, it’s also immobilized until it Escapes\. The Escape DC is 16\. A creature adjacent to the target can Interact to remove the net\./i, "Puedes utilizar una red, o bien sola, o bien amarrada a una cuerda. Cuando está amarrada a una cuerda, puedes utilizar la red para Apresar a una criatura Mediana o más pequeña a una distancia de hasta 10 pies (3 m) en lugar de sólo a criaturas adyacentes. Puedes continuar Apresando para mantener tu presa sobre el objetivo, si éste permanece a 10 pies (3 m) o menos y continúas sosteniendo la red. La criatura apresada obtiene un bonificador +2 por circunstancia a sus pruebas de Huir si no estás adyacente a ella y puede hacer una prueba de Atletismo CD 16 para Abrir la red por la fuerza. Una vez el objetivo deja de estar apresado, la red es engorrosa hasta que se vuelve a doblar mediante una acción de Interactuar con el rasgo concentrar que requiere dos manos; si se utiliza sin haber sido doblada, las pruebas de Apresar hechas con la red sufren un penalizador -2. Cuando la red no está amarrada puedes hacer una tirada de ataque a distancia utilizando tu competencia en armas sencillas contra una criatura Mediana o más pequeña a 20 pies (6 m) o menos. Con un impacto, el objetivo queda desprevenido y sufre un penalizador -10 pies (3 m) por circunstancia a sus Velocidades hasta que Huye y, con un impacto crítico, también queda inmovilizado hasta que Huye. La CD de Huir es 16. Una criatura adyacente al objetivo puede Interactuar para quitarle la red."],
            [/Ordinary clothing is functional with basic tailoring, such as peasant garb, monk’s robes, or  work clothes\./i, "La ropa normal es funcional y tiene un corte básico, como la de campesino, la de monje o la de trabajo."],
            [/Explorer’s clothing is sturdy enough that it can be reinforced to protect you, even though it isn’t a suit of armor\. It comes in many forms, though the most common resemble clerical vestments, monk’s garments, or wizard’s robes, as members of these classes likely avoid wearing armor\./i, "La ropa de explorador es lo suficientemente recia como para poderla reforzar y que te proteja, aunque no se puede considerar armadura. Hay muchas formas, aunque las más comunes se parecen a las vestimentas de clérigo, los adornos de monje o los ropajes de mago, puesto que los miembros de dichas clases es probable que eviten llevar armadura."],
            [/A sack can hold up to 8 Bulk worth of items\. A sack containing 2 Bulk or less can be worn on the body, usually tucked into a belt\. You can carry a sack with one hand, but must use two hands to transfer items in and out\./i, "Un saco puede acarrear hasta Impedimenta 8 en objetos. Un saco que contiene Impedimenta 2 o menos se puede llevar en el cuerpo, usualmente pasado por el cinto. Puedes llevar un saco en una mano, pero tienes que usar las dos para meter y sacar objetos."],
            [/When sounded, a signal whistle can be heard clearly up to half a mile away across open terrain\./i, "Cuando se sopla, un silbato de señales se puede oír claramente hasta a media milla (800 m) en terreno despejado."],
            [/Primal spellcasters, especially druids, often wear adornments of natural materials to symbolize their connection to nature, such as rings of woven plants, tokens made from animal parts, or other symbols related to a druidic order or nature philosophy\./i, "Los lanzadores de conjuros primigenios, especialmente los druidas, a menudo lucen adornos con materiales naturales para simbolizar su conexión con la Naturaleza, como por ejemplo anillos de plantas tejidas, amuletos hechos de partes de animales u otros símbolos relacionados con una orden druídica o filosofía de la Naturaleza."],
            [/This piece of wood or silver is emblazoned with an image representing a deity\. Some divine spellcasters, such as clerics, can use a religious symbol to use certain abilities\. A religious symbol can be worn on the body on a chain or pin, or can be held\./i, "Este trozo de madera o de plata está blasonado con una imagen que representa a un dios. Algunos lanzadores de conjuros divinos, como por ejemplo los clérigos, pueden emplear un símbolo religioso para usar ciertas aptitudes. Un símbolo religioso se puede llevar puesto en el cuerpo mediante una cadena o un broche, o puede sostenerse con la mano."],
            [/This manuscript contains scripture of a particular religion\. Some divine spellcasters, such as clerics, can use a religious text to use certain abilities\. A religious text must be held in one hand to use it\./i, "Este manuscrito contiene escrituras de una religión en particular. Algunos lanzadores de conjuros divinos, como por ejemplo los clérigos, pueden utilizar un texto religioso para usar ciertas aptitudes. Un texto religioso se tiene que sostener en una mano para utilizarlo."],
            [/You can draw this reinforced sheath during the same Interact action you use to draw the weapon it holds, wielding the weapon in one hand and the scabbard in your other\. A parrying scabbard can be used for your defense much like a weapon with the parry trait/i, "Puedes sacar esta vaina reforzada durante la misma acción de Interactuar que usas para desenvainar el arma que contiene, empuñando el arma en una mano y la vaina en la otra. Puedes utilizar para tu defensa una vaina de parada en gran medida como un arma con el rasgo parada: inviertes una acción para posicionarla defensivamente y obtienes un bonificador +1 por circunstancia a la CA hasta el inicio de tu siguiente turno. Hay vainas de parada disponibles para cualquier espada de las que se empuñan a una mano."],
            [/This leather sheath is large enough to hold an item of up to light Bulk and is typically used for daggers, wands, thieves’ toolkits, and similar objects\. You can affix it to the inside of a boot, under a bracer or sleeve, or in other inconspicuous locations to gain a \+1 item bonus to Stealth checks and DCs to hide or conceal the item within\./i, "Esta vaina de cuero es lo suficientemente grande como para alojar un objeto de hasta Impedimenta ligera y se utiliza típicamente para dagas, varitas, juegos de herramientas de ladrón y objetos similares. Puedes fijarla al interior de una bota, bajo unos brazales o una manga o en cualquier otro lugar discreto para obtener un bonificador +1 por objeto a las pruebas de Sigilo y a las clases de dificultad para esconder u ocultar el objeto de su interior."],
            [/A lit candle sheds dim light in a 10-foot radius for 8 hours\./i, "Una vela encendida emite luz tenue en un radio de 10 pies (3 m) durante 8 horas."],
            [/Rations for 1 week/i, "Raciones para una semana."],

            [/\bPrice\b/i, "Precio"],
            [/\bHands\b/i, "Manos"],
            [/\bBulk\b/i, "Impedimenta"],
            [/\bUsage\b/i, "Usanza"],

            [/\bDexterity or other\b/, "Destreza u otra"],

            [/\ba number of additional skills equal to\b/, "tantas habilidades adicionales como"],
            [/\byour choice of Acrobatics or Athletics\b/, "Acrobacias o Atletismo, a elegir"],
            [/\bone skill determined by your choice of deity\b/, "una habilidad determinada por tu elección de dios"],
            [/\bone skill determined by your druidic order\b/, "una habilidad determinada por tu orden druídica"],
            [/\bone or more skills determined by your rogue's racket\b/, "una o más habilidades determinadas por tu enredo de pícaro"],
            [/\bone skill determined by your patron\b/, "una habilidad determinada por tu patrón"],
            [/\bplus your Intelligence modifier\b/, "más tu modificador por Inteligencia"],
            [/\bplus your Constitution modifier\b/, "más tu modificador por Constitución"],

            [/\bbard class DC\b/, "la CD de la bardo"],
            [/\bcleric class DC\b/, "la CD de la clase clérigo"],
            [/\bdruid class DC\b/, "la CD de la clase druida"],
            [/\bfighter class DC\b/, "la CD de la clase guerrero"],
            [/\branger class DC\b/, "la CD de la clase explorador"],
            [/\brogue class DC\b/, "la CD de la clase pícaro"],
            [/\bwitch class DC\b/, "la CD de la clase brujo"],
            [/\bwizard class DC\b/, "la CD de la clase mago"],

            [/\bsimple weapons\b/, "armas sencillas"],
            [/\bmartial weapons\b/, "armas marciales"],
            [/\badvanced weapons\b/, "armas avanzadas"],
            [/\bunarmed attacks\b/, "ataques sin armas"],
            [/\bthe favored weapon of your deity\. If your deity's favored weapon is uncommon, you also gain access to that weapon\./, "el arma predilecta de tu dios. Si dicha arma es poco común, también obtienes acceso a ella"],

            [/\bspell attack modifier\b/, "modificador al ataque de conjuro"],
            [/\bspell DC\b/, "la CD de conjuros"],

            [/\bUntrained in all armor, though your doctrine might alter this\b/, "No entrenado en todas las armaduras, aunque tu doctrina podría alterar esto"],
            [/\bUntrained in all armor\b/, "No entrenado en ninguna armadura"],
            [/\bTrained in unarmored defense\b/, "Entrenado en defensa sin armadura"],
            [/\ball armor\b/, "todas las armaduras"],
            [/\blight armor\b/, "armadura ligera"],
            [/\bmedium armor\b/, "armadura intermedia"],
            [/\bheavy armor\b/, "armadura pesada"],

            [/\bTrained in\b/, "Entrenado en"],
            [/\bExpert in\b/, "Experto en"],
            [/\bMaster in\b/, "Maestro en"],
            [/\bLegendary in\b/, "Legendario en"],

            [/\bAmmunition arrow\b/i, "Munición para arcos"],
            [/\bAmmunition bolt\b/i, "Munición para ballestas"],
            [/\bAmmunition sling bullet\b/i, "Munición para hondas"],

            [/\byour Intelligence modifier \(if it(’|')s positive\)\./i, "tu modificador por Inteligencia (si es positivo)."],
            [/Additional languages equal to/i, "Tantos idiomas adicionales como"],
            [/\bChoose from the list of common languages\b/, "Elige de entre la lista de idiomas comunes"],
            [/\bChoose from\b/, "Elige entre"],
            [/and any other languages to which you have access \(such as the languages prevalent in your region\)\./i, "y cualquier otro idioma al que tienes acceso (por ejemplo, los predominantes en tu región)."],
            [/\bChthonian\b/, "Chthoniano"],
            [/\bCommon\b/, "Común"],
            [/\bDiabolic\b/, "Diabólico"],
            [/\bDraconic\b/, "Dracónico"],
            [/\bDwarven\b/, "Enano"],
            [/\bElven\b/, "Elfo"],
            [/\bEmpyrean\b/, "Empíreo"],
            [/\bFey\b/, "Feérico"],
            [/\bGnomish\b/, "Gnomo"],
            [/\bHalfling\b/, "Mediano"],
            [/\bOrcish\b/, "Orco"],
            [/\bPetran\b/, "Petrano"],
            [/\bPyric\b/, "Pírico"],
            [/\bShadowtongue\b/, "Lengua sombría"],
            [/\bSussuran\b/, "Sussurano"],
            [/\bTaldane\b/, "Taldano"],
            [/\bThalassic\b/, "Talásico"],

            [/\bAcrobatics\b/, "Acrobacias"],
            [/\bArcana\b/, "Arcanos"],
            [/\bAthletics\b/, "Atletismo"],
            [/\bCrafting\b/, "Artesanía"],
            [/\bDeception\b/, "Engaño"],
            [/\bDiplomacy\b/, "Diplomacia"],
            [/\bIntimidation\b/, "Intimidación"],
            [/\bLore\b/, "Saber"],
            [/\bMedicine\b/, "Medicina"],
            [/\bNature\b/, "Naturaleza"],
            [/\bOccultism\b/, "Ocultismo"],
            [/\bPerception\b/, "Percepción"],
            [/\bPerformance\b/, "Interpretación"],
            [/\bReligion\b/, "Religión"],
            [/\bSociety\b/, "Sociedad"],
            [/\bStealth\b/, "Sigilo"],
            [/\bSurvival\b/, "Supervivencia"],
            [/\bThievery\b/, "Latrocinio"],

            [/\bStrength\b/, "Fuerza"],
            [/\bDexterity\b/, "Destreza"],
            [/\bConstitution\b/, "Constitución"],
            [/\bIntelligence\b/, "Inteligencia"],
            [/\bWisdom\b/, "Sabiduría"],
            [/\bCharisma\b/, "Carisma"],

            [/\bFortitude\b/, "Fortaleza"],
            [/\bReflex\b/, "Reflejos"],
            [/\bWill\b/, "Voluntad"],

            [/(?<=\d)\s?ft\./, " pies"],
            [/\bfeet\b/i, "pies"],
            [/\bTiny\b/, "Menudo"],
            [/\bSmall\b/, "Pequeño"],
            [/\bMedium\b/, "Mediano"],
            [/\bLarge\b/, "Grande"],
            [/\bHuge\b/, "Enorme"],
            [/\bGargantuan\b/, "Gargantuesco"],

            [/\bNo description\b/i, "Sin descripción"],

            [/\bor\b/, "o"],
        ]

        // ==== style rules =======================================================================|

        document.head.append(Object.assign(document.createElement("style"), {
            type: "text/css",
            textContent: `.speedsizerow {
                width: max-content;
            }
            .modal-button {
                min-width: max-content;
            }
            .section-menu-fake {
                margin-right: 1em;
                color: #a1a1a1;
                display: inline-block;
                cursor: pointer;
                font-size: 1.3em;
            }
            .section-menu-fake:hover {
                color: #ff5722;
            }
            .section-menu-selected-fake {
                color: #ff5722 !important;
            }`
        }))

        // ==== AC. special rules =================================================================|

        const enableSpecialRules = 1;
        if (enableSpecialRules) {
            // example of including a rule list defined in a spearate script.
            if (unsafeWindow.globalListName) {
                replaceRules = replaceRules.concat(unsafeWindow.globalListName);
            }
        }
        //consolelog(replaceRules,"all rules"); //test: double check rule contents

        // ==== BA. script options ================================================================|

        const classWhitelist = /notif-hidden|notif-text|tag-inst|-counter/i;
        // text nodes with parent elements with these classes are excluded.

        const generateRecheckButton = 1;

        let dynamicChecking = 1; // default 1; set to 1 to run the script automatically when new image elements are detected.
        dynamicChecking = getOptionState("enable-"+ scriptPrefix +"dynamic-checking", dynamicChecking);
        // setting to 0 would make this run a few more times when dynamically checking.

        // ==== checked in processPage() ====
        // managable with optional Script Options userscript.
        let logRuntimes = 1; // default 0; set to 1 to log function runtimes to the console.
        let markCheckedElements = 1; // default 1; set to 0 if certain sites start appearing weirdly.

        let enableSpecialReplace = 0;
        let fullDelete = 0; // default 1; if 1, text is completely replaced.
        let addTag = 0; // if fullDelete is active, adds a tag without replacing.

        // ==== BB. notif code ====================================================================|

        // 'script options' options
        let enableExecCounter = 0;
        enableExecCounter = getOptionState("enable-"+ scriptPrefix +"counter", enableExecCounter);
        let enableNotifications = 0;
        enableNotifications = getOptionState("enable-"+ scriptPrefix +"notifs", enableNotifications);
        let autohideNotifs = 0; // default 0; notifs disappear after a set period of time. used in createNotif()
        let startCollapsed = 1; //default 1;

        // notif css variables.
        const notifsHex = "#ddd";
        const notifsOpacity = .4; // default .4; set to a value between 0 and 1, 1 is no transparency, .5 is 50% transparency.
        const notifsWidth = 120; // default 120; width in pixels of each notification.

        let notifContainerId = "notif-main-container";

        // generate notif container if needed.
        if ((enableExecCounter || enableNotifications) && !jQuery("#"+ notifContainerId).length) {

            // ==== setting/checking initial visual state of notifs ====

            // constrolled exclusively by local storage or the default value.
            const localStorageName = "notif start collapsed";
            if (window.localStorage.getItem(localStorageName)) {
                startCollapsed = window.localStorage.getItem(localStorageName);
                startCollapsed = (startCollapsed == "true");
            }

            const visibleClass = "notif-visible";
            const hiddenClass = "notif-hidden1";
            let startingStateClass = visibleClass;
            let otherStartingStateClass = hiddenClass;
            if (startCollapsed) {
                startingStateClass = hiddenClass;
                otherStartingStateClass = visibleClass;
            }

            // ==== create container ==============================================================|
            /*
            [ notif main container
                [notif1] - counters
                [hide] - button
                [open] - button
                [close] - button
                [clear] - button
                [notif2
                    [dlt-container]
                    [ll-container]
                    [ot-container]
                ]

            ]
            - hide: makes visible open | hides close, clear, notif2
            - open: makes visible hide, close, clear, notif2 | hides open
            - close: deletes notif main container.
            - clear: empties notif-container2
            */

            const openButtonId = "notif-open";
            const hideButtonId = "notif-hide";

            let notificationsElement =
                "<div id='"+ notifContainerId +"'>"+
                "<div id='notif-container1'></div>"+
                "<div id='"+ hideButtonId +"' class='notif-red notif-rounded-block "+ startingStateClass +"'>notif hide</div>"+
                "<div id='"+ openButtonId +"' class='notif-green notif-rounded-block "+ otherStartingStateClass +"'>notif open</div>"+
                "<div id='notif-close' class='notif-gray notif-rounded-block "+ startingStateClass +"'>close notif[]</div>"+
                "<div id='notif-clear' class='notif-orange notif-rounded-block "+ startingStateClass +"'>clear notif</div>"+
                "<div id='notif-container2' class=' "+ startingStateClass +"'>"+
                    "<div id='dlt-container'></div>"+
                    "<div id='ll-container' class='notif-hidden1'></div>"+
                    "<div id='ot-container' class='notif-hidden1'</div>"+
                "</div>"+
                "</div>";
            jQuery("body").prepend(notificationsElement);

            let textReaderElement =
                "<div id='notif-text-overlay' class='notif-text-hidden'></div>";
            jQuery("body").prepend(textReaderElement);

            jQuery('#notif-container2').on( {
                mouseenter: function () {
                    let notifText = jQuery(this).find(".notif-text").text();
                    let notifClassList = this.className;
                    if (/red/.test(notifClassList)) {
                        jQuery("#notif-text-overlay").addClass("notif-red");
                    }else if (/orange/.test(notifClassList)) {
                        jQuery("#notif-text-overlay").addClass("notif-orange");
                    }else if (/yellow/.test(notifClassList)) {
                        jQuery("#notif-text-overlay").addClass("notif-yellow");
                    }else {
                        jQuery("#notif-text-overlay").addClass("notif-gray");
                    }
                    jQuery("#notif-text-overlay").text(notifText);
                    jQuery("#notif-text-overlay").addClass("notif-text-visible");
                },
                mouseleave: function () {
                    jQuery("#notif-text-overlay").removeClass("notif-text-visible");
                    jQuery("#notif-text-overlay").removeClass("notif-red");
                    jQuery("#notif-text-overlay").removeClass("notif-orange");
                }
            }, '.notif-instance');

            // ==== close ====
            jQuery("#notif-close").click(function(){
                jQuery("#"+notifContainerId).remove();
                //console.log("RPL notif close clicked. ("+notifContainerId+")");
            });

            // ==== clears container2 which contains notif instances. ====
            function clearNotif(){
                jQuery("#notif-container2").empty();
            }
            jQuery("#notif-clear").click(clearNotif);

            // ==== open/hide events ==============================================================|

            const mainSelector = "#notif-container2, #"+ hideButtonId +", #notif-close, #notif-clear";

            jQuery("#"+ hideButtonId).click(function () {
                //console.log(hideButtonId);
                window.localStorage.setItem(localStorageName, true);

                switchClasses(
                    mainSelector,
                    "#"+ openButtonId,
                    visibleClass,
                    hiddenClass
                );
            });

            jQuery("#"+ openButtonId).click(function () {
                //console.log(openButtonId);
                window.localStorage.setItem(localStorageName, false);

                switchClasses(
                    mainSelector,
                    "#"+ openButtonId,
                    hiddenClass,
                    visibleClass
                );
            });

            function switchClasses(mainSelector, subSelector, removedClass, newClass) {
                jQuery(mainSelector).removeClass(removedClass);
                jQuery(mainSelector).addClass(newClass);
                jQuery(subSelector).removeClass(newClass);
                jQuery(subSelector).addClass(removedClass);
            }

            // ==== CSS ===========================================================================|
            if(1){var notifsCss =
    `<style type="text/css">
        #`+ notifContainerId +` {
            width: `+ notifsWidth +`px;
            max-height: 50%;
            margin: 0 2px 2px;
            display: block;

            line-height: initial;
            color: #000;
            opacity: `+ notifsOpacity +`;
            position: fixed;
            top: 0px;
            right: 0px;
            z-index: 9999;
            overflow-y: auto;
        }
        #`+ notifContainerId +`:hover {
            opacity: 1;
        }

        .notif-rounded-block {
            display: block;
            padding: 2px;
            border-radius: 3px;
            margin-top: 2px;

            font-size: 11px !important;
            font-weight: bold;
            text-align: center;
            cursor: pointer;
        }

        .s-counter {
            display: block;
            padding: 2px;
            border-radius: 4px;
            margin-top: 2px;

            background: #ddd;
            font-size: 11px !important;
            font-weight: bold;
            text-align: center;
        }

        .notif-text-hidden {
            display:none;
        }
        .notif-text-visible {
            display: block;
            max-width: 50%;
            padding: 5px;
            border: #999 solid 2px;
            border-radius: 10px;

            position: fixed;
            top: 5px;
            left: 5px;
            z-index: 999999;


            font-size: 15px !important;
            font-weight: bold !important;
            text-align: center !important;
            color: black !important;
        }

        .notif-instance {
            display: block;
            padding: 2px;
            border-radius: 4px;
            margin-top: 2px;

            background: `+ notifsHex +`;
            font-size: 11px !important;
            font-weight: bold;
            text-align: center;
            cursor: pointer;
        }

        .notif-instance div{/* div holding the rule.*/
            max-height: 12px;
            padding: 0px;
            margin: 0px;
            border: 0px;

            overflow: hidden;
            word-break: break-all;
        }
        .notif-hidden{ /* meant to hide the rule */
            opacity: .1;
        }
        .notif-hidden:hover {
            opacity: 1;
        }

        .notif-red {
            background: #f67066;
        }
        .notif-orange {
            background: #ffc107; //yellowish
        }
        .notif-yellow {
            background: #ffc107; //yellowish
        }
        .notif-green {
            background: #62bb66;
        }
        .notif-gray {
            background: #777;
        }

        /* collapsible classes */
        .notif-hidden1 {
            display: none !important;
        }
        .notif-visible {
            display: block !important;
        }

        div#ll-container, div#ot-container {
            border-top: solid black 3px;
        }
    </style>`;
            }
            jQuery(document.body).append(notifsCss);
        }

        if(enableExecCounter) {
            jQuery("#notif-container1").prepend("<div id='"+ scriptTag +"-counter' class='s-counter .notif-rounded-block'>T No text nodes found.</div>");
        }

        // resets lastIndex on tests with global modifiers.
        RegExp.prototype.regexTest = function(testString){
            //consolelog("## regexTest() ##", 1);
            if (this.test(testString)) {
                if (/.\/i?g/.test(this) && this.lastIndex) {//regex global modifier needs to be reset.
                    //consolelog("## last index: "+ this.lastIndex +" ##", 1);
                    this.lastIndex = 0;
                }
                return true;
            }
            return false;
        };

        NodeList.prototype.forEach = Array.prototype.forEach;

        // ==== CA. processPage() =================================================================|

        // ==== processPage() globals ====
        let titleChecked = 0; // if the page title was checked or not.
        let fullCheck = 0;

        // ==== counters ====
        let nodeCounter = 0; // counts text nodes.
        let deleteMatches = 0;
        let fullReplaceMatches = 0;
        let executionCounter = 0; // the number of times processPage() was executed.
        let sectionMenuChecked = false;

        // delegated: matches problematic elements at click time, even if added/hidden/recreated later.
        jQuery(document).on("click", ".trait", function (e) {
            e.preventDefault();
            const traitTextNode = this.firstChild;
            if (!traitTextNode) return;
            const spanishText = traitTextNode.nodeValue;
            const englishText = getEnglish(spanishText);
            traitTextNode.nodeValue = englishText != null ? englishText : spanishText;
            setTimeout(() => { traitTextNode.nodeValue = spanishText; }, 50);
        });

        function processPage() {
            executionCounter++;

            logRuntimes = getOptionState("log-"+ scriptPrefix +"runtimes", logRuntimes);
            if (logRuntimes) {
                var startTime = performance.now();
            }

            let rulesNum = replaceRules.length;

            // per element variables
            let ruleMatched = 0;

            // ==== checks the title of the page ==================================================|
            if(1){
                let titleText = jQuery("title").text();
                if (titleText && !titleChecked) {
                    for (let index = 0; index < rulesNum; index++) {
                        if (replaceRules[index][0].regexTest(titleText)) {
                            consolelog(scriptTag +" (title match): "+ titleText +" | "+ replaceRules[index][0], "TT-MA");
                            titleText = titleText.replace(replaceRules[index][0], replaceRules[index][1]);
                            jQuery("title").text(titleText);
                        }
                    }
                    titleChecked = 1;
                }
            }

            // ==== selects specified text elements ===============================================|
            if(1){
                const excludedElements = /CODE|SCRIPT|STYLE|TEXTAREA/i;
                const checkClassRegex = new RegExp(scriptPrefix +"node","i");
                var textWalker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: function (node) {
                            if (node.nodeValue.trim() &&
                                !excludedElements.test(node.parentNode.nodeName) && // exclude scripts and style elements
                                (fullCheck || !checkClassRegex.test(node.parentNode.classList)) && // exclude checked elements
                                !classWhitelist.test(node.parentNode.classList)) {
                                return NodeFilter.FILTER_ACCEPT;
                            }
                            return NodeFilter.FILTER_SKIP;
                        }
                    },
                    false
                );
            }
            let textNode = textWalker.nextNode();
            let previousParent;

            // Phase 1: collect all nodes before mutating any classList.
            let nodesToProcess = [];
            while (textNode) {
                nodesToProcess.push(textNode);
                textNode = textWalker.nextNode();
            }

            // Phase 2: mark + replace using the pre-collected list.
            for (const textNode of nodesToProcess) {
                let nodeText = textNode.nodeValue;
                // let parentNodeClass = textNode.parentNode.classList;
                // let grandparentNodeClass = textNode.parentNode.parentNode.classList;
                // let previousSiblingTag;
                // if (textNode.previousSibling) { previousSiblingTag = textNode.previousSibling.nodeName; }
                if (!fullCheck) {
                    let immediateParentNode = textNode.parentNode;
                    nodeCounter++;

                    if (previousParent && !(previousParent == immediateParentNode)) {
                        markCheckedElements = getOptionState(scriptPrefix + "mark-checked", markCheckedElements);
                        if (markCheckedElements) {
                            previousParent.classList.add(scriptPrefix + "node-" + nodeCounter);
                        }
                        previousParent = immediateParentNode;
                    } else if (!previousParent) {
                        previousParent = immediateParentNode;
                    }
                }

                let rulesToUse = getReplaceRules(textNode);
                if (rulesToUse == null) continue;
                rulesNum = rulesToUse.length;

                // if (grandparentNodeClass.contains("listview-detail")
                //     || parentNodeClass.contains("layout-item")) {
                //     console.log("I have a special parent: " + nodeText);
                //     if (previousSiblingTag == "B") {
                //         console.log("I have a <b> sibling: " + nodeText);
                //         rulesToUse = replaceRules;
                //     } else {
                //         const specialClasses = ["listview-detail", "layout-item"];
                //         let useGrandparent = false;
                //         for (const specialClass of specialClasses) {
                //             if (grandparentNodeClass.contains(specialClass)) { useGrandparent = true; }
                //         }
                //         rulesToUse = getReplaceRules(useGrandparent ? textNode.parentNode : textNode);
                //         rulesNum = rulesToUse.length;
                //     }
                // } else if (parentNodeClass) {
                //     rulesToUse = getReplaceRules(textNode);
                //     rulesNum = rulesToUse.length;
                // } else {
                //     rulesToUse = replaceRules;
                // }

                // ==== for each rule =============================================================|
                for (let index = 0; index < rulesNum; index++) {

                    let currentRuleRegex = rulesToUse[index][0];
                    let replacementValue = rulesToUse[index][1];

                    if (currentRuleRegex.regexTest(nodeText.trim())) {
                        ruleMatched = 1;
                        let matchPrefix = "GEN0";
                        consolelog("("+ scriptTag +") (n)"+ nodeCounter +" (match): "+ nodeText.trim() +" | "+ currentRuleRegex, "TXT-MA");

                        const disableReplace = 0; // test: check what is checked through each run.
                        if (!disableReplace) {

                            enableSpecialReplace = getOptionState("enable-special-replace", enableSpecialReplace);
                            // ==== delete1 match =================================================|
                            if (enableSpecialReplace && (/DELETE1/.test(replacementValue) || /DELETE2/.test(replacementValue)) ) {
                                deleteMatches++;

                                matchPrefix = "DLT99";
                                if (/DELETE1/.test(replacementValue) && !/DELETE1/.test(nodeText)) {
                                    matchPrefix = "DLT1";
                                }else if (/DELETE2/.test(replacementValue) && !/DELETE2/.test(nodeText)) {
                                    matchPrefix = "DLT2";
                                }

                                consolelog("("+ scriptTag +") ("+ matchPrefix +") n"+ nodeCounter +" (match): "+ nodeText.trim() +" | "+ currentRuleRegex, matchPrefix);
                                createNotif(nodeCounter +" "+ matchPrefix, currentRuleRegex, nodeText);

                                fullDelete = getOptionState("enable-full-delete", fullDelete);
                                addTag = getOptionState("add-tag", addTag);
                                const tagRegex = new RegExp("^\\["+matchPrefix);

                                if (fullDelete) {
                                    nodeText = "## "+ matchPrefix +" ##"; // replaces the text completely.
                                    break;
                                }else if (addTag && !tagRegex.text(nodeText)) {
                                    nodeText = "["+ matchPrefix +"]: " + nodeText; // prepends DLT1 or DLT2
                                }
                            }
                            // ==== full replace match ============================================|
                            if (enableSpecialReplace && /^FR1/.test(replacementValue)) {
                                fullReplaceMatches++;
                                matchPrefix = "FR1";
                                consolelog("("+ scriptTag +") ("+ matchPrefix +") n"+ nodeCounter +" (match): "+ nodeText.trim() +" | "+ currentRuleRegex, matchPrefix);
                                createNotif(nodeCounter +" "+ matchPrefix, currentRuleRegex, nodeText);

                                nodeText = replacementValue;
                                break;
                            }
                            // ==== base case =====================================================|
                            nodeText = nodeText.replace(currentRuleRegex, replacementValue);
                        } // end if (!disableReplace)
                    }
                } // end for (each rule) ==========================================================|

                if (ruleMatched) { // modify text block.
                    ruleMatched = 0;
                    textNode.nodeValue = nodeText;
                    consolelog("("+ scriptTag +") (n)"+ nodeCounter +" (text): "+ nodeText.trim(), "CH-TT");
                }
            } // end for (textNode) =============================================================|

            if (!fullCheck) {
                // ==== update counter ====
                let counterText = "T DLT:"+ deleteMatches +" | FR:"+ fullReplaceMatches +" | N:"+ nodeCounter + " | EX:"+ executionCounter;
                jQuery("#"+ scriptTag +"-counter").text(counterText);
                if (nodeCounter) {
                    jQuery("#"+ scriptTag +"-counter").addClass("notif-green");
                }
            }else { //end fullCheck.
                fullCheck = 0;
            }

            //consolelog("## ("+ scriptTag +") execution #"+ executionCounter +" ##", "EXEC");
            // script option handles if this is displayed or not.
            if (logRuntimes) {
                const endTime = performance.now();
                const runTime = ((endTime - startTime) / 1000).toFixed(2);
                if (runTime > 1) {
                    consolelog('('+ scriptTag +') finished after ' + runTime + ' seconds.', "RUNT");
                }else {
                    consolelog('('+ scriptTag +') finished in less than 1 second.', "RUNT");
                }
            }
        } //end function function replaceText()

        function getEnglish(spanishText) {
            let rulesNum = reverseReplaceRules.length;

            for (let index = 0; index < rulesNum; index++) {
                let currentRuleRegex = reverseReplaceRules[index][0];
                let replacementValue = reverseReplaceRules[index][1];

                if (currentRuleRegex.regexTest(spanishText.trim())) {
                    return spanishText.replace(currentRuleRegex, replacementValue);
                }
            }
        }

        function getReplaceRules(textNode) {
            let parentNode = textNode.parentNode;
            let grandparentNode;
            if (parentNode) { grandparentNode = parentNode.parentNode; }
            let previousSibling;
            if (textNode.previousSibling) { previousSibling = textNode.previousSibling; }
            let englishTabs = ["Weapons", "Defense", "Gear", "Spells", "Pets", "Details", "Feats", "Actions"];
            let spanishTabs = ["Armas", "Defensa", "Equipo", "Conjuros", "Mascotas", "Detalles", "Dotes", "Acciones"];

            switch (true) {
                case (!parentNode):
                    return replaceRules;
                    break;
                case (!parentNode.classList):
                    return replaceRules;
                    break;
                case parentNode.classList.contains("section-menu"):
                    if (!parentNode.previousSibling && textNode.nodeValue != "Weapons") return sectionMenuReplaceRules;
                    if (textNode.nodeValue == "Weapons" || englishTabs.includes(parentNode.previousSibling.firstChild.nodeValue)) { // so 'Gear' tab doesn't get renamed and break navigation
                        let spanishNode = parentNode.cloneNode(true);
                        spanishNode.classList.remove("section-menu");
                        spanishNode.classList.add("section-menu-fake");
                        if (textNode.nodeValue == "Weapons") {
                            spanishNode.classList.remove("section-menu-selected");
                            // spanishNode.classList.add("section-menu-selected-fake");
                        }
                        spanishNode.firstChild.nodeValue = spanishTabs[englishTabs.findIndex((text) => text == textNode.nodeValue)];
                        spanishNode.addEventListener("click", (e) => {
                            // spanishNode.classList.add("section-menu-selected-fake");
                            spanishNode.nextSibling.click();
                        });
                        // if (!sectionMenuChecked) {
                        //     grandparentNode.addEventListener("click", (e) => {
                        //         for (const node of grandparentNode.childNodes) {
                        //             if (node.classList.contains("section-menu-fake")) {
                        //                 if (e.target != node) {
                        //                     node.classList.remove("section-menu-selected-fake");
                        //                 }
                        //             }
                        //         }
                        //     });
                        //     sectionMenuChecked = true;
                        // }
                        parentNode.setAttribute("style", "display: none;");
                        grandparentNode.insertBefore(spanishNode, parentNode);
                        return replaceRules;
                    } else {
                        return sectionMenuReplaceRules;
                    }
                    break;
                case (grandparentNode.classList.contains("listview-detail")
                      || parentNode.classList.contains("layout-item")):
                    console.log("I have a special parent: " + textNode.nodeValue);
                    if ((previousSibling ?? textNode).nodeName == "B") {
                        console.log("I have a <b> sibling: " + textNode.nodeValue);
                        if (textNode.nodeValue == " Chain") {
                            textNode.nodeValue = " Malla";
                            return null;
                        } else {
                            return replaceRules;
                        }
                    } else {
                        return listviewDetailReplaceRules;
                    }
                    break;
                case parentNode.classList.contains("listview-detail"):
                    return listviewDetailReplaceRules;
                    break;
                case parentNode.classList.contains("layout-item"):
                    return listviewDetailReplaceRules;
                    break;
                default:
                    return replaceRules;
            }
        }

        // ==== CB. execution control =============================================================|

        //console.log("("+ scriptTag +") EXEC: Initial run.");
        //processPage();
        let runWhenReady = 0;
        runWhenReady = getOptionState("run-when-ready", runWhenReady);
        if (runWhenReady) {
            jQuery(document).ready(function() { //after DOM has loaded.
                consolelog("("+ scriptTag +") EXEC: document.ready()", "EXEC");
                //fullCheck = 1;
                processPage();
            });
        }

        let runWhenLoaded = 1;
        runWhenLoaded = getOptionState("run-when-loaded", runWhenLoaded);
        if (runWhenLoaded) {
            jQuery(window).on("load", function() { //after all initial images are loaded.
                consolelog("("+ scriptTag +") EXEC: window.load()", "EXEC");
                //fullCheck = 1;
                processPage();
            });
        }
        if (dynamicChecking) {
            jQuery(document).ready(waitForKeyElements("img", processPage));
            jQuery(document).ready(waitForKeyElements(".modal-content", processPage));
            jQuery(document).ready(waitForKeyElements(".modal-content", processPage));
        }

        // ==== DA. script button =================================================================|

        let buttonsContainerId = "ctb-container1";
        if (generateRecheckButton && jQuery("#"+ buttonsContainerId).length) {
            jQuery("#"+ buttonsContainerId).prepend("<div id='"+ scriptTag +"-reset' class='ctb-blue ctb-rounded-block'>run "+ scriptTag +"</div>"); //added to beginning
            //jQuery("#"+ scriptTag +"-reset").click(processPage);
            jQuery("#"+ scriptTag +"-reset").click(function() {
                fullCheck = 1;
                processPage();
            });
        }

        // ==== DB. support functions =============================================================|

        function createNotif(notifLabel, notifRule, notifText) { //msg1 needs to match notifTypes
            enableNotifications = getOptionState("enable-"+ scriptPrefix +"notifs", enableNotifications);
            if (enableNotifications) {
                let additionalClass = "notif-gray";
                let notifContainer = "ot-container";
                if (/dlt/i.test(notifLabel)) {
                    additionalClass = "notif-red";
                    notifContainer = "dlt-container";
                }

                let newNotif =
                    "<div class='notif-instance "+ additionalClass +"'><div>t n"+ notifLabel +"</div>"+
                        "<div class='notif-hidden'>"+ notifRule +"</div>"+
                        "<div class='notif-text' hidden>"+ notifText+"</div>"+ // to be displayed at the bottom left.
                    "</div>";

                let enabledNotifTypesRegex = /./;
                if (enabledNotifTypesRegex.test(notifLabel)) {
                    jQuery("#"+ notifContainer).append(newNotif);
                    jQuery(".notif-instance").click(function(){
                        jQuery("#notif-container2").empty();
                    });

                    if (!/dlt/i.test(notifLabel)) {
                        jQuery("#ot-container").removeClass("notif-hidden1");
                    }

                    autohideNotifs = getOptionState("autohide-notifications", autohideNotifs);
                    if (autohideNotifs) {
                        const notifDuration = 10; // default 10; amount of seconds notifications are displayed before disappearing.
                        setTimeout(function() {
                            jQuery(".notif-instance").remove();
                        }, notifDuration*1000);
                    }
                }
            }
        } // end function creatNotif()

        function consolelog(text, messageType) {
            if (enableConsoleMessages && enabledMessagesRegex.test(messageType)) {
                console.log(text);
            }
        }

        // ==== script end ========================================================================|
        consolelog("#### ("+ scriptTag +") text replace script is active. ####", "EXEC");

    } // end if (runScript)

    // ============================================================================================|

    // = getOptionState(, );
    // used to update option if 'script option' is set.
    function getOptionState(idName, currentState) {
        if (document.getElementById(idName)) {
            return document.getElementById(idName).checked;
        }
        return currentState;
    }
})();